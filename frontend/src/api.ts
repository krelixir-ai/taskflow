// frontend/src/api.ts

// --- Type Definitions ---
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

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

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: string;
  tags?: string[];
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: string;
  tags?: string[];
  due_date?: string;
}

export interface ApiVersionResponse {
  version: string;
}

// --- API Client Configuration ---
// In production: empty string → relative paths → nginx proxies /api/ to backend Cloud Run
// In local dev: empty string → relative paths → Vite proxy forwards to localhost:8080
// Override with VITE_API_BASE_URL env var if needed for a specific backend URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function for fetch requests
async function fetchApi<T>(
  method: string,
  path: string,
  data?: any,
  params?: Record<string, any>
): Promise<T> {
  // Build the URL string — works with both absolute URLs and relative paths
  let fullUrl = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, String(params[key]));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      fullUrl += `?${qs}`;
    }
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(fullUrl, options);

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use default message
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content for delete operations
  if (response.status === 204) {
    return {} as T; // Return empty object for no content
  }

  return response.json();
}

// --- API Endpoints ---
export const api = {
  listTasks: (params?: { status?: string }) =>
    fetchApi<Task[]>('GET', '/api/tasks', undefined, params),

  getTask: (id: string) =>
    fetchApi<Task>('GET', `/api/tasks/${id}`),

  createTask: (data: TaskCreate) =>
    fetchApi<Task>('POST', '/api/tasks', data),

  updateTask: (id: string, data: TaskUpdate) =>
    fetchApi<Task>('PUT', `/api/tasks/${id}`, data),

  deleteTask: (id: string) =>
    fetchApi<void>('DELETE', `/api/tasks/${id}`), // Assuming delete returns no content

  getApiVersion: () =>
    fetchApi<ApiVersionResponse>('GET', '/api/version'),
};
