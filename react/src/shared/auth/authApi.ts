import type { AuthResponse, LoginRequest, RegisterRequest, User } from './authTypes';

const API_BASE = '/api/auth';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('aegis_token');
};

export const setStoredToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('aegis_token', token);
  } else {
    localStorage.removeItem('aegis_token');
  }
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const loginApi = async (req: LoginRequest): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid email or password.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Login failed (${res.status})`);
  }
  return res.json();
};

export const registerApi = async (req: RegisterRequest): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Registration failed (${res.status})`);
  }
  return res.json();
};

export const fetchMeApi = async (): Promise<User> => {
  const res = await fetch(`${API_BASE}/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Session expired. Please log in again.');
  }
  return res.json();
};
