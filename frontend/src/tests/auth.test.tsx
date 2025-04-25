import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../AuthContext';
import Login from '../Components/Authentication/Login';
import { tokenService } from '../services/tokenService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      // Mock successful login response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          statusCode: 200,
          message: 'Successfully logged in!',
          data: {
            user: {
              id: '123',
              email: 'test@example.com',
              name: 'Test User'
            }
          }
        }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <Login switchToSignup={() => {}} />
          </AuthProvider>
        </BrowserRouter>
      );

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByText(/sign in/i));

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/login successful/i)).toBeInTheDocument();
      });
    });

    it('should handle login failure', async () => {
      // Mock failed login response
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Invalid credentials'
          }
        }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <Login switchToSignup={() => {}} />
          </AuthProvider>
        </BrowserRouter>
      );

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      // Submit form
      fireEvent.click(screen.getByText(/sign in/i));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh token when access token expires', async () => {
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          statusCode: 200,
          message: 'Tokens refreshed successfully'
        }
      });

      // Mock failed request with expired token
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            code: 'INVALID_TOKEN'
          }
        }
      });

      // Mock successful retry after token refresh
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          statusCode: 200,
          data: {
            email: 'test@example.com'
          }
        }
      });

      // Trigger token refresh
      await tokenService.refreshToken();

      // Verify token refresh was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/auth/refresh-token',
        {},
        { withCredentials: true }
      );
    });

    it('should refresh token based on user activity', async () => {
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          statusCode: 200,
          message: 'Tokens refreshed successfully'
        }
      });

      // Simulate user activity
      fireEvent.mouseMove(document);
      fireEvent.keyDown(document);
      fireEvent.click(document);
      fireEvent.scroll(document);

      // Wait for activity-based refresh
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/auth/refresh-token',
          {},
          { withCredentials: true }
        );
      });
    });

    it('should handle multiple tabs token refresh', async () => {
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          statusCode: 200,
          message: 'Tokens refreshed successfully'
        }
      });

      // Simulate storage event from another tab
      const storageEvent = new StorageEvent('storage', {
        key: 'last_activity',
        newValue: Date.now().toString(),
        oldValue: null,
        storageArea: localStorage
      });
      window.dispatchEvent(storageEvent);

      // Wait for token refresh
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/auth/refresh-token',
          {},
          { withCredentials: true }
        );
      });
    });

    it('should not refresh token when user is inactive', async () => {
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          statusCode: 200,
          message: 'Tokens refreshed successfully'
        }
      });

      // Set last activity to more than 5 minutes ago
      localStorage.setItem('last_activity', (Date.now() - 6 * 60 * 1000).toString());

      // Trigger token refresh
      await tokenService.refreshToken();

      // Verify token refresh was not called
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Logout Flow', () => {
    it('should clear tokens on logout', async () => {
      // Mock successful logout
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          statusCode: 200,
          message: 'Successfully logged out'
        }
      });

      // Call logout
      await tokenService.clearTokens();

      // Verify localStorage is cleared
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
}); 