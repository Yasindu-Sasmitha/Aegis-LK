export type UserRole = 'Admin' | 'DisasterOfficer' | 'Responder' | 'Citizen';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  district?: string | null;
  phoneNumber?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  district?: string;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
