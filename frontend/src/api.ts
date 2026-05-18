import { jwtDecode } from 'jwt-decode';

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

// Authentication types
export interface User {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

interface DecodedToken {
  sub: string; // username
  exp: number; // expiration timestamp
}

export const decodeAndValidateToken = (token: string | null): User | null => {
  if (!token) return null;
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) {
      // Token expired
      console.warn("Token expired.");
      return null;
    }
    // For simplicity, we'll just return a User-like object with username from token
    // In a real app, you might fetch full user details or store more in the token
    return { id: 'unknown', username: decoded.sub, created_at: '', updated_at: '' };
  } catch (error) {
    console.error("Failed to decode or validate token:", error);
    return null;
  }
};


// --- API Client ---

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || response.statusText || 'Something went wrong');
  }
  return response.json();
};

const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

export const api = {
  // Tasks
  listTasks: async (params: { status?: string }, token: string): Promise<Task[]> => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/tasks?${query}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse(response);
  },

  createTask: async (task: TaskCreate, token: string): Promise<Task> => {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(task),
    });
    return handleResponse(response);
  },

  updateTask: async (id: string, task: TaskUpdate, token: string): Promise<Task> => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(task),
    });
    return handleResponse(response);
  },

  deleteTask: async (id: string, token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || response.statusText || 'Failed to delete task');
    }
  },

  // Authentication
  register: async (payload: RegisterPayload): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const formBody = new URLSearchParams();
    formBody.append('username', payload.username);
    formBody.append('password', payload.password);

    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });
    return handleResponse(response);
  },

  getCurrentUser: async (token: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse(response);
  },

  // General
  getApiVersion: async (): Promise<ApiVersionResponse> => {
    const response = await fetch(`${API_BASE_URL}/version`);
    return handleResponse(response);
  },

  // Admin
  redeployApplication: async (token: string): Promise<RedeployResponse> => {
    const response = await fetch(`${API_BASE_URL}/admin/redeploy`, {
      method: 'POST',
      headers: getAuthHeaders(token),
    });
    return handleResponse(response);
  },
};
