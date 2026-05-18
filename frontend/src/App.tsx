import { useState, useEffect, useCallback, useRef } from 'react'
import { api, Task, TaskCreate, TaskUpdate, ApiVersionResponse, TaskStatus, RedeployResponse, User, decodeAndValidateToken } from './api' // Import RedeployResponse, User, decodeAndValidateToken
import TaskModal from './TaskModal'
import ConfirmDialog from './ConfirmDialog'
import AuthModal from './AuthModal' // Import AuthModal

type StatusFilter = '' | 'todo' | 'in_progress' | 'review' | 'done'
type ToastType = 'success' | 'error'

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false) // For Create/Edit Modal
  const [editingTask, setEditingTask] = useState<Task | null>(null) // For Create/Edit Modal

  const [toasts, setToasts] = useState<Toast[]>([])
  const [apiVersion, setApiVersion] = useState<string | null>(null);

  // State for inline editing
  const [editingInlineTaskId, setEditingInlineTaskId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<'title' | 'description' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const inlineEditInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // State for delete confirmation
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  // State for redeploy confirmation
  const [showConfirmRedeploy, setShowConfirmRedeploy] = useState(false);

  // NEW: Authentication states
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);


  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const loadTasks = useCallback(async () => {
    if (!authToken) {
      setTasks([]); // Clear tasks if not authenticated
      setLoading(false);
      return;
    }
    try {
      setLoading(true)
      const params: { status?: string } = {}
      if (statusFilter) params.status = statusFilter
      const data = await api.listTasks(params, authToken) // Pass authToken
      setTasks(data)
    } catch (err: any) {
      showToast(err.message || 'Failed to load tasks', 'error')
      if (err.message === 'Could not validate credentials') {
        handleLogout(); // Log out if token is invalid
        showToast('Your session has expired. Please log in again.', 'error');
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, showToast, authToken])

  // NEW: Function to fetch API version, now a useCallback
  const fetchApiVersion = useCallback(async () => {
    try {
      const response = await api.getApiVersion();
      setApiVersion(response.version);
    } catch (err) {
      console.error("Failed to fetch API version:", err);
      // Optionally show a toast, but not critical for app functionality
    }
  }, []); // No dependencies, as it only fetches data

  // NEW: Effect to load user from token and fetch tasks
  useEffect(() => {
    const initializeAuthAndTasks = async () => {
      if (authToken) {
        const decodedUser = decodeAndValidateToken(authToken);
        if (decodedUser) {
          try {
            // Fetch full user details to ensure it's valid and get ID/timestamps
            const user = await api.getCurrentUser(authToken);
            setCurrentUser(user);
            loadTasks();
          } catch (err) {
            console.error("Failed to fetch current user:", err);
            handleLogout(); // Token might be invalid or expired on server
            showToast('Your session is invalid. Please log in again.', 'error');
          }
        } else {
          handleLogout(); // Token invalid or expired client-side
        }
      } else {
        setCurrentUser(null);
        setTasks([]); // Clear tasks if no token
        setLoading(false);
      }
    };
    initializeAuthAndTasks();
  }, [authToken, loadTasks, showToast]);


  // New: Fetch API version on component mount
  useEffect(() => {
    fetchApiVersion();
  }, [fetchApiVersion]); // Add fetchApiVersion to dependency array

  // Auto-focus inline edit input when it appears
  useEffect(() => {
    if (editingInlineTaskId && inlineEditInputRef.current) {
      inlineEditInputRef.current.focus();
    }
  }, [editingInlineTaskId]);


  const handleCreate = async (data: TaskCreate | TaskUpdate) => {
    if (!authToken) return;
    await api.createTask(data as TaskCreate, authToken)
    showToast('Task created successfully')
    setModalOpen(false)
    loadTasks()
  }

  const handleUpdate = async (data: TaskCreate | TaskUpdate) => {
    if (!editingTask || !authToken) return
    await api.updateTask(editingTask.id, data as TaskUpdate, authToken)
    showToast('Task updated successfully')
    setEditingTask(null)
    setModalOpen(false) // Close modal after update
    loadTasks()
  }

  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!authToken) return;
    await api.updateTask(task.id, { status: newStatus }, authToken)
    showToast(`Moved to ${newStatus.replace('_', ' ')}`)
    loadTasks()
  }

  // Inline editing handlers
  const startInlineEdit = (task: Task, field: 'title' | 'description') => {
    if (!authToken) {
      showToast('Please log in to edit tasks.', 'error');
      return;
    }
    setEditingInlineTaskId(task.id);
    setInlineEditField(field);
    setInlineEditValue(field === 'title' ? task.title : task.description || '');
  };

  const handleInlineEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInlineEditValue(e.target.value);
  };

  const handleInlineEditSave = async (task: Task) => {
    if (!editingInlineTaskId || !inlineEditField || !authToken) return;

    const trimmedValue = inlineEditValue.trim();
    if (!trimmedValue && inlineEditField === 'title') {
      showToast('Title cannot be empty', 'error');
      return;
    }

    try {
      await api.updateTask(task.id, { [inlineEditField]: trimmedValue }, authToken);
      showToast(`${inlineEditField} updated successfully`);
      setEditingInlineTaskId(null);
      setInlineEditField(null);
      setInlineEditValue('');
      loadTasks(); // Reload to reflect changes
    } catch (err: any) {
      showToast(err.message || `Failed to update ${inlineEditField}`, 'error');
    }
  };

  const handleInlineEditCancel = () => {
    setEditingInlineTaskId(null);
    setInlineEditField(null);
    setInlineEditValue('');
  };

  const handleInlineEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, task: Task) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineEditSave(task);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleInlineEditCancel();
    }
  };

  // Delete functionality handlers
  const handleDeleteClick = (task: Task) => {
    if (!authToken) {
      showToast('Please log in to delete tasks.', 'error');
      return;
    }
    setTaskToDelete(task)
    setShowConfirmDelete(true)
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete || !authToken) return
    try {
      await api.deleteTask(taskToDelete.id, authToken)
      showToast('Task deleted successfully', 'success')
      loadTasks()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error')
    } finally {
      setShowConfirmDelete(false)
      setTaskToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setShowConfirmDelete(false)
    setTaskToDelete(null)
  }

  // Redeploy functionality handlers
  const handleRedeployClick = () => {
    if (!authToken) {
      showToast('Please log in to redeploy the application.', 'error');
      return;
    }
    setShowConfirmRedeploy(true);
  };

  const handleConfirmRedeploy = async () => {
    if (!authToken) return;
    try {
      const response: RedeployResponse = await api.redeployApplication(authToken);
      showToast(response.message, 'success');
      fetchApiVersion(); // Re-fetch API version after successful redeploy
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger redeployment', 'error');
    } finally {
      setShowConfirmRedeploy(false);
    }
  };

  const handleCancelRedeploy = () => {
    setShowConfirmRedeploy(false);
  };

  // NEW: Authentication handlers
  const handleLoginSuccess = (token: string, user: User) => {
    localStorage.setItem('authToken', token);
    setAuthToken(token);
    setCurrentUser(user);
    setShowAuthModal(false);
    showToast(`Welcome, ${user.username}!`, 'success');
    loadTasks(); // Reload tasks after successful login
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setCurrentUser(null);
    setTasks([]); // Clear tasks on logout
    showToast('Logged out successfully', 'success');
  };


  // Filter tasks client-side by search query
  const filteredTasks = tasks.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      t.tags.some((tag: string) => tag.toLowerCase().includes(q)) || // Fixed: Added type annotation for 'tag'
      (t.assignee || '').toLowerCase().includes(q)
    )
  })

  // Stats
  const stats = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ]

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header" id="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">⚡</div>
          <div>
            <h1>TaskFlow</h1>
            <span>Manage your tasks with clarity in Todo App</span>
          </div>
        </div>
        <div className="header-actions">
          {currentUser ? (
            <>
              <span className="user-info">Hello, {currentUser.username}!</span>
              <button
                id="btn-new-task"
                className="btn btn-primary"
                onClick={() => { setEditingTask(null); setModalOpen(true) }}
              >
                ✚ New Task
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setShowAuthModal(true)}
            >
              Login / Register
            </button>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="stats-bar" id="stats-bar">
        <div className="stat-card todo">
          <span className="stat-value">{stats.todo}</span>
          <span className="stat-label">To Do</span>
        </div>
        <div className="stat-card in-progress">
          <span className="stat-value">{stats.in_progress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card review">
          <span className="stat-value">{stats.review}</span>
          <span className="stat-label">Review</span>
        </div>
        <div className="stat-card done">
          <span className="stat-value">{stats.done}</span>
          <span className="stat-label">Done</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" id="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="search-input"
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={!currentUser} // Disable search if not logged in
          />
        </div>
        <div className="filter-group">
          {statusFilters.map(f => (
            <button
              key={f.value}
              className={`filter-btn ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
              disabled={!currentUser} // Disable filters if not logged in
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : !currentUser ? (
        <div className="empty-state" id="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Authentication Required</h3>
          <p>Please log in or register to view and manage your tasks.</p>
          <button className="btn btn-primary" onClick={() => setShowAuthModal(true)} style={{ marginTop: 'var(--space-md)' }}>
            Login / Register
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state" id="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No tasks found</h3>
          <p>
            {searchQuery || statusFilter
              ? 'Try adjusting your filters or search query.'
              : 'Create your first task to get started!'}
          </p>
        </div>
      ) : (
        <div className="task-list" id="task-list">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`task-card priority-${task.priority} status-${task.status}`}
              onClick={() => {
                // Only open modal if not currently inline editing this task
                if (editingInlineTaskId !== task.id) {
                  setEditingTask(task);
                  setModalOpen(true);
                }
              }}
            >
              <div className="task-card-header">
                {editingInlineTaskId === task.id && inlineEditField === 'title' ? (
                  <input
                    ref={inlineEditInputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={inlineEditValue}
                    onChange={handleInlineEditChange}
                    onBlur={() => handleInlineEditSave(task)}
                    onKeyDown={(e) => handleInlineEditKeyDown(e, task)}
                    className="inline-edit-input"
                    onClick={e => e.stopPropagation()} // Prevent modal from opening
                  />
                ) : (
                  <span
                    className="task-title"
                    onDoubleClick={(e) => { e.stopPropagation(); startInlineEdit(task, 'title'); }}
                  >
                    {task.title}
                  </span>
                )}
                <div className="task-actions" onClick={e => e.stopPropagation()}>
                  {task.status !== 'done' && (
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Mark as done"
                      onClick={() => handleQuickStatusChange(task, 'done')}
                    >
                      ✓
                    </button>
                  )}
                  {task.status === 'done' && (
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Reopen"
                      onClick={() => handleQuickStatusChange(task, 'todo')}
                    >
                      ↩
                    </button>
                  )}
                  {/* NEW: Delete button */}
                  <button
                    className="btn btn-ghost btn-sm btn-icon btn-ghost-danger"
                    title="Delete task"
                    onClick={() => handleDeleteClick(task)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {task.description && (
                editingInlineTaskId === task.id && inlineEditField === 'description' ? (
                  <textarea
                    ref={inlineEditInputRef as React.RefObject<HTMLTextAreaElement>}
                    value={inlineEditValue}
                    onChange={handleInlineEditChange}
                    onBlur={() => handleInlineEditSave(task)}
                    onKeyDown={(e) => handleInlineEditKeyDown(e, task)}
                    className="inline-edit-textarea"
                    onClick={e => e.stopPropagation()} // Prevent modal from opening
                  />
                ) : (
                  <p
                    className="task-description"
                    onDoubleClick={(e) => { e.stopPropagation(); startInlineEdit(task, 'description'); }}
                  >
                    {task.description}
                  </p>
                )
              )}
              <div className="task-meta">
                <span className={`task-badge badge-priority-${task.priority}`}>
                  {task.priority}
                </span>
                <span className={`badge-status badge-status-${task.status}`}>
                  {task.status.replace('_', ' ')}
                </span>
                {task.assignee && (
                  <span className="task-tag">👤 {task.assignee}</span>
                )}
                {task.tags.map((tag: string) => ( // Fixed: Added type annotation for 'tag'
                  <span key={tag} className="task-tag">{tag}</span>
                ))}
                <span className="task-date">{formatDate(task.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          onClose={() => { setModalOpen(false); setEditingTask(null) }}
          onSubmit={editingTask ? handleUpdate : handleCreate}
        />
      )}

      {/* NEW: Delete Confirmation Dialog */}
      {showConfirmDelete && taskToDelete && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${taskToDelete.title}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* NEW: Redeploy Confirmation Dialog */}
      {showConfirmRedeploy && (
        <ConfirmDialog
          title="Redeploy Application"
          message="Are you sure you want to redeploy the application? This will restart the backend service."
          onConfirm={handleConfirmRedeploy}
          onCancel={handleCancelRedeploy}
        />
      )}

      {/* NEW: Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? '✓' : '✕'} {t.message}
          </div>
        ))}
      </div>

      {/* New: Footer with API Version and Redeploy Button */}
      <footer className="app-footer">
        TaskFlow Frontend v0.0.2 {apiVersion && ` | API v${apiVersion}`}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleRedeployClick}
          style={{ marginLeft: 'auto' }} // Push to the right
          disabled={!currentUser} // Disable redeploy button if not logged in
        >
          Redeploy App
        </button>
      </footer>
    </div>
  )
}
