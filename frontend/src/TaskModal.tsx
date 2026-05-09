import { useState, type FormEvent } from 'react'
import type { Task, TaskCreate, TaskUpdate } from './api'

interface Props {
  task: Task | null;  // null = create mode
  onClose: () => void;
  onSubmit: (data: TaskCreate | TaskUpdate) => Promise<void>;
}

export default function TaskModal({ task, onClose, onSubmit }: Props) {
  const isEdit = !!task

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium')
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'todo')
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
  const [tags, setTags] = useState<string[]>(task?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const data: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        assignee: assignee.trim() || undefined,
        tags,
        due_date: dueDate || undefined,
      }
      await onSubmit(data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateTime = (isoString: string | undefined) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Task' : 'Create New Task'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Title</label>
            <input
              id="task-title"
              className="form-input"
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              className="form-textarea"
              placeholder="Add details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                className="form-select"
                value={priority}
                onChange={e => setPriority(e.target.value as Task['priority'])}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="task-status">Status</label>
              <select
                id="task-status"
                className="form-select"
                value={status}
                onChange={e => setStatus(e.target.value as Task['status'])}
              >
                <option value="todo">📋 To Do</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="review">👁️ Review</option>
                <option value="done">✅ Done</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="task-assignee">Assignee</label>
              <input
                id="task-assignee"
                className="form-input"
                type="text"
                placeholder="Who's responsible?"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="task-due-date">Due Date</label>
              <input
                id="task-due-date"
                className="form-input"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            <div className="form-tags-input">
              {tags.map(tag => (
                <span key={tag} className="form-tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
              <input
                id="tag-input"
                type="text"
                placeholder="Type and press Enter..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
            </div>
          </div>

          {isEdit && task && (
            <div className="form-row" style={{ marginTop: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Created At</label>
                <p className="form-text-display">{formatDateTime(task.created_at)}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Last Updated</label>
                <p className="form-text-display">{formatDateTime(task.updated_at)}</p>
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
              {error}
            </p>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '...' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
