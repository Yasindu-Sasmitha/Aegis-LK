import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterPage } from './RegisterPage';
import * as authApi from './authApi';
import { AuthProvider } from './AuthContext';

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderRegisterPage = (onSwitchToLogin = vi.fn()) => {
    return {
      onSwitchToLogin,
      ...render(
        <AuthProvider>
          <RegisterPage onSwitchToLogin={onSwitchToLogin} />
        </AuthProvider>
      ),
    };
  };

  it('renders all citizen registration input fields', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: /create citizen account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. kasun perera/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. kasun@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+94 77/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete citizen registration/i })).toBeInTheDocument();
  });

  it('renders district options including major Sri Lankan administrative districts', () => {
    renderRegisterPage();

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('Colombo');

    expect(screen.getByRole('option', { name: 'Kandy' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Galle' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ratnapura' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gampaha' })).toBeInTheDocument();
  });

  it('allows user to fill the form and select district', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText(/e\.g\. kasun perera/i), 'Sunil Shantha');
    await user.type(screen.getByPlaceholderText(/e\.g\. kasun@example\.com/i), 'sunil@gmail.com');
    await user.type(screen.getByPlaceholderText(/create a strong password/i), 'Pass@12345');
    await user.selectOptions(screen.getByRole('combobox'), 'Ratnapura');
    await user.type(screen.getByPlaceholderText(/\+94 77/i), '+94771234567');

    expect(screen.getByPlaceholderText(/e\.g\. kasun perera/i)).toHaveValue('Sunil Shantha');
    expect(screen.getByPlaceholderText(/e\.g\. kasun@example\.com/i)).toHaveValue('sunil@gmail.com');
    expect(screen.getByRole('combobox')).toHaveValue('Ratnapura');
    expect(screen.getByPlaceholderText(/\+94 77/i)).toHaveValue('+94771234567');
  });

  it('submits registration data to registerApi and handles success', async () => {
    const user = userEvent.setup();
    const registerSpy = vi.spyOn(authApi, 'registerApi').mockResolvedValueOnce({
      token: 'jwt-new-citizen-token',
      user: {
        id: 'new-user-id',
        email: 'sunil@gmail.com',
        fullName: 'Sunil Shantha',
        role: 'Citizen',
        district: 'Ratnapura',
        phoneNumber: '+94771234567',
        isActive: true,
        createdAt: '2026-01-01',
      },
    });

    renderRegisterPage();

    await user.type(screen.getByPlaceholderText(/e\.g\. kasun perera/i), 'Sunil Shantha');
    await user.type(screen.getByPlaceholderText(/e\.g\. kasun@example\.com/i), 'sunil@gmail.com');
    await user.type(screen.getByPlaceholderText(/create a strong password/i), 'Pass@12345');
    await user.selectOptions(screen.getByRole('combobox'), 'Ratnapura');
    await user.type(screen.getByPlaceholderText(/\+94 77/i), '+94771234567');
    await user.click(screen.getByRole('button', { name: /complete citizen registration/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith({
        fullName: 'Sunil Shantha',
        email: 'sunil@gmail.com',
        password: 'Pass@12345',
        district: 'Ratnapura',
        phoneNumber: '+94771234567',
      });
    });

    expect(localStorage.getItem('aegis_token')).toBe('jwt-new-citizen-token');
  });

  it('displays error banner when registration fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, 'registerApi').mockRejectedValueOnce(
      new Error('An account with this email address already exists.')
    );

    renderRegisterPage();

    await user.type(screen.getByPlaceholderText(/e\.g\. kasun perera/i), 'Kasun Perera');
    await user.type(screen.getByPlaceholderText(/e\.g\. kasun@example\.com/i), 'citizen@aegis.lk');
    await user.type(screen.getByPlaceholderText(/create a strong password/i), 'Aegis@123');
    await user.click(screen.getByRole('button', { name: /complete citizen registration/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/an account with this email address already exists/i)
      ).toBeInTheDocument();
    });
  });

  it('navigates back to login view when Sign In link is clicked', async () => {
    const user = userEvent.setup();
    const { onSwitchToLogin } = renderRegisterPage();

    const signInLink = screen.getByRole('button', { name: /sign in here/i });
    await user.click(signInLink);

    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });
});
