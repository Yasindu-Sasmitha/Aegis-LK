import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';
import * as authApi from './authApi';
import { AuthProvider } from './AuthContext';

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderLoginPage = (onSwitchToRegister = vi.fn()) => {
    return {
      onSwitchToRegister,
      ...render(
        <AuthProvider>
          <LoginPage onSwitchToRegister={onSwitchToRegister} />
        </AuthProvider>
      ),
    };
  };

  it('renders all login form elements correctly', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your username or email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('allows user to enter email and password credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const emailInput = screen.getByPlaceholderText(/enter your username or email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    await user.type(emailInput, 'officer@aegis.lk');
    await user.type(passwordInput, 'Aegis@123');

    expect(emailInput).toHaveValue('officer@aegis.lk');
    expect(passwordInput).toHaveValue('Aegis@123');
  });

  it('toggles password visibility between password and text type', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays error message banner when authentication fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, 'loginApi').mockRejectedValueOnce(new Error('Invalid email or password.'));

    renderLoginPage();

    const emailInput = screen.getByPlaceholderText(/enter your username or email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'wrong@aegis.lk');
    await user.type(passwordInput, 'WrongPass123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('calls login API successfully and persists token', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: 'mock-jwt-token-xyz',
      user: {
        id: 'user-1',
        email: 'officer@aegis.lk',
        fullName: 'DMC Officer',
        role: 'DisasterOfficer',
        district: 'Colombo',
        isActive: true,
        createdAt: '2026-01-01',
      },
    };
    const loginSpy = vi.spyOn(authApi, 'loginApi').mockResolvedValueOnce(mockResponse);

    renderLoginPage();

    await user.type(screen.getByPlaceholderText(/enter your username or email/i), 'officer@aegis.lk');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'Aegis@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: 'officer@aegis.lk',
        password: 'Aegis@123',
      });
    });

    expect(localStorage.getItem('aegis_token')).toBe('mock-jwt-token-xyz');
  });

  it('triggers onSwitchToRegister callback when Register button is clicked', async () => {
    const user = userEvent.setup();
    const { onSwitchToRegister } = renderLoginPage();

    const registerBtn = screen.getByRole('button', { name: /register/i });
    await user.click(registerBtn);

    expect(onSwitchToRegister).toHaveBeenCalledTimes(1);
  });
});
