export type UserRole = 'Admin' | 'DisasterOfficer' | 'Responder' | 'Citizen';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  district?: string | null;
  phoneNumber?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
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

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  district?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  district?: string;
  phoneNumber?: string;
}

export interface UpdateAdminUserRequest {
  email: string;
  fullName: string;
  role: UserRole;
  district?: string;
  phoneNumber?: string;
  newPassword?: string;
}

export interface SetUserStatusRequest {
  isActive: boolean;
}

export interface AdminUserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

