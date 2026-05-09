import { useState, useEffect, useCallback, useRef } from 'react'
import { api, Task, TaskCreate, TaskUpdate, ApiVersionResponse } from './api' // Import ApiVersionResponse
import TaskModal from './TaskModal'
import ConfirmDialog from './ConfirmDialog'
import TaskDetailModal from './TaskDetailModal' // Import the new detail modal

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
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [viewingTask, setViewingTask] = useState<Task | null>(null) // New state for Detail Modal
  const [toasts, setToasts] = useState<Toast[]>([])
  const [apiVersion, setApiVersion] = useState<string | null>(null); // New state for API version

  // State for inline editing
  const [editingInlineTaskId, setEditingInlineTaskId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<'title' | 'description' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const inlineEditInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);


  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const params: { status?: string } = {}
      if (statusFilter) params.status = statusFilter
      const data = await api.listTasks(params)
      setTasks(data)
    } catch (err: any) {
      showToast(err.message || 'Failed to load tasks', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, showToast])

  useEffect(() => { loadTasks() }, [loadTasks])

  // New: Fetch API version on component mount
  useEffect(() => {
    const fetchApiVersion = async () => {
      try {
        const response = await api.getApiVersion();
        setApiVersion(response.version);
      } catch (err) {
        console.error("Failed to fetch API version:", err);
        // Optionally show a toast, but not critical for app functionality
      }
    };
    fetchApiVersion();
  }, []); // Run once on mount

  // Auto-focus inline edit input when it appears
  useEffect(() => {
    if (editingInlineTaskId && inlineEditInputRef.current) {
      inlineEditInputRef.current.focus();
    }
  }, [editingInlineTaskId]);


  const handleCreate = async (data: TaskCreate | TaskUpdate) => {
    await api.createTask(data as TaskCreate)
    showToast('Task created successfully')
    setModalOpen(false)
    loadTasks()
  }

  const handleUpdate = async (data: TaskCreate | TaskUpdate) => {
    if (!editingTask) return
    await api.updateTask(editingTask.id, data as TaskUpdate)
    showToast('Task updated successfully')
    setEditingTask(null)
    setModalOpen(false) // Close modal after update
    loadTasks()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await api.deleteTask(deleteTarget.id)
    showToast('Task deleted')
    setDeleteTarget(null)
    loadTasks()
  }

  const handleQuickStatusChange = async (task: Task, newStatus: Task['status']) => {
    await api.updateTask(task.id, { status: newStatus })
    showToast(`Moved to ${newStatus.replace('_', ' ')}`)
    loadTasks()
  }

  // Inline editing handlers
  const startInlineEdit = (task: Task, field: 'title' | 'description') => {
    setEditingInlineTaskId(task.id);
    setInlineEditField(field);
    setInlineEditValue(field === 'title' ? task.title : task.description || '');
  };

  const handleInlineEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInlineEditValue(e.target.value);
  };

  const handleInlineEditSave = async (task: Task) => {
    if (!editingInlineTaskId || !inlineEditField) return;

    const trimmedValue = inlineEditValue.trim();
    if (!trimmedValue && inlineEditField === 'title') {
      showToast('Title cannot be empty', 'error');
      return;
    }

    try {
      await api.updateTask(task.id, { [inlineEditField]: trimmedValue });
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

  // Handler for opening the detail view modal
  const handleViewDetails = (task: Task) => {
    setViewingTask(task);
  };


  // Filter tasks client-side by search query
  const filteredTasks = tasks.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
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
            <span>Manage your tasks with clarity</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            id="btn-new-task"
            className="btn btn-primary"
            onClick={() => { setEditingTask(null); setModalOpen(true) }}
          >
            ✚ New Task
          </button>
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
          />
        </div>
        <div className="filter-group">
          {statusFilters.map(f => (
            <button
              key={f.value}
              className={`filter-btn ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
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
                  {/* New: View Details Button */}
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    title="View Details"
                    onClick={() => handleViewDetails(task)}
                  >
                    👁️
                  </button>
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
                  {task.status !== 'todo' && (
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      title="Delete"
                      onClick={() => setDeleteTarget(task)}
                    >
                      ✕
                    </button>
                  )}
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
                {task.tags.map(tag => (
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

      {/* Task Detail Modal - Displays comprehensive information for a selected task */}
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
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

      {/* New: Footer with API Version */}
      <footer className="app-footer">
        TaskFlow Frontend v0.0.2 {apiVersion && ` | API v${apiVersion}`}
      </footer>
    </div>
  )
}
