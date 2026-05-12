// Define types directly in api.ts to resolve "Cannot find module './schemas'"
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: string;
  tags?: string[];
  due_date?: string; // ISO date string
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: string;
  tags?: string[];
  due_date?: string; // ISO date string
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee?: string;
  tags: string[];
  due_date?: string; // ISO date string
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export interface ApiVersionResponse {
  version: string;
}

// In production: empty string → relative paths → nginx proxies /api/ to backend
// In local dev: empty string → Vite proxy forwards to localhost:8080
// Override with VITE_API_BASE_URL env var if needed
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function callApi<T>(
  endpoint: string,
  method: string = 'GET',
  data?: any
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Something went wrong');
  }

  // Handle 204 No Content for delete operations
  if (response.status === 204) {
    return null as T; // Or handle as appropriate for your app
  }

  return response.json() as Promise<T>;
}

export const api = {
  listTasks: (params?: { status?: string; priority?: string }): Promise<Task[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    const queryString = query.toString();
    return callApi<Task[]>(`/api/tasks${queryString ? `?${queryString}` : ''}`);
  },

  // The getTask API call is no longer used in the frontend after removing TaskDetailModal,
  // but it remains available in the backend and could be used by other parts of the app.
  getTask: (id: string): Promise<Task> => {
    return callApi<Task>(`/api/tasks/${id}`);
  },

  createTask: (task: TaskCreate): Promise<Task> => {
    return callApi<Task>('/api/tasks', 'POST', task);
  },

  updateTask: (id: string, task: TaskUpdate): Promise<Task> => {
    return callApi<Task>(`/api/tasks/${id}`, 'PUT', task);
  },

  deleteTask: (id: string): Promise<void> => {
    return callApi<void>(`/api/tasks/${id}`, 'DELETE');
  },

  getApiVersion: (): Promise<ApiVersionResponse> => {
    return callApi<ApiVersionResponse>('/api/version');
  },
};
