/**
 * TaskFlow — API Client
 * Handles all HTTP requests to the FastAPI backend.
 */

const API_BASE = '/api/tasks';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignee: string | null;
  tags: string[];
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: Task['priority'];
  status?: Task['status'];
  assignee?: string;
  tags?: string[];
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: Task['priority'];
  status?: Task['status'];
  assignee?: string;
  tags?: string[];
  due_date?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listTasks: (params?: { status?: string; priority?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.priority) qs.set('priority', params.priority);
    const query = qs.toString();
    return request<Task[]>(`${API_BASE}${query ? `?${query}` : ''}`);
  },

  getTask: (id: string) => request<Task>(`${API_BASE}/${id}`),

  createTask: (data: TaskCreate) =>
    request<Task>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: TaskUpdate) =>
    request<Task>(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string) =>
    request<void>(`${API_BASE}/${id}`, { method: 'DELETE' }),
};
