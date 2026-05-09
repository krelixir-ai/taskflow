import type { Task } from './api';

interface Props {
  task: Task;
  onClose: () => void;
}

export default function TaskDetailModal({ task, onClose }: Props) {
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

  const formatDate = (iso: string | null) => {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Task Details</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="task-detail-content">
          <div className="form-group">
            <label className="form-label">Title</label>
            <p className="form-text-display">{task.title}</p>
          </div>

          {task.description && (
            <div className="form-group">
              <label className="form-label">Description</label>
              <p className="form-text-display" style={{ whiteSpace: 'pre-wrap', overflow: 'auto' }}>{task.description}</p>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <p className="form-text-display">
                <span className={`task-badge badge-priority-${task.priority}`}>
                  {task.priority}
                </span>
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <p className="form-text-display">
                <span className={`badge-status badge-status-${task.status}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <p className="form-text-display">{task.assignee || 'Unassigned'}</p>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <p className="form-text-display">{formatDate(task.due_date)}</p>
            </div>
          </div>

          {task.tags.length > 0 && (
            <div className="form-group">
              <label className="form-label">Tags</label>
              <div className="form-tags-display">
                {task.tags.map(tag => (
                  <span key={tag} className="task-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

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
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
