const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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

export interface RedeployResponse {
  message: string;
}


// --- API Client ---

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || response.statusText || 'Something went wrong');
  }
  return response.json();
};

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export const api = {
  // Tasks
  listTasks: async (params: { status?: string }): Promise<Task[]> => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/tasks?${query}`, {
      headers: defaultHeaders,
    });
    return handleResponse(response);
  },

  createTask: async (task: TaskCreate): Promise<Task> => {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(task),
    });
    return handleResponse(response);
  },

  updateTask: async (id: string, task: TaskUpdate): Promise<Task> => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify(task),
    });
    return handleResponse(response);
  },

  deleteTask: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: defaultHeaders,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || response.statusText || 'Failed to delete task');
    }
  },

  // General
  getApiVersion: async (): Promise<ApiVersionResponse> => {
    const response = await fetch(`${API_BASE_URL}/version`);
    return handleResponse(response);
  },

  // Admin
  redeployApplication: async (): Promise<RedeployResponse> => {
    const response = await fetch(`${API_BASE_URL}/admin/redeploy`, {
      method: 'POST',
      headers: defaultHeaders,
    });
    return handleResponse(response);
  },
};
