import axios from 'axios';
import { toast } from 'react-hot-toast';

const TOKEN_REFRESH_THRESHOLD = 30; // seconds before expiration to refresh
const ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity
const LAST_ACTIVITY_KEY = 'last_activity';
const REFRESH_IN_PROGRESS_KEY = 'refresh_in_progress';
const MIN_REFRESH_INTERVAL = 30000; // Minimum time between refresh attempts (30 seconds)
const ACTIVITY_THROTTLE = 1000; // Throttle activity updates to once per second

class TokenService {
  private refreshPromise: Promise<void> | null = null;
  private isRefreshing = false;
  private lastRefreshTime = 0;
  private activityThrottleTimeout: NodeJS.Timeout | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    if (!this.isInitialized) {
      this.setupActivityTracking();
      this.setupTokenRefresh();
      this.isInitialized = true;
    }
  }

  // Setup activity tracking with throttling
  private setupActivityTracking() {
    const updateActivity = () => {
      if (this.activityThrottleTimeout) {
        clearTimeout(this.activityThrottleTimeout);
      }

      this.activityThrottleTimeout = setTimeout(() => {
        const now = Date.now();
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      }, ACTIVITY_THROTTLE);
    };

    // Track user activity with throttling
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Initial activity update
    updateActivity();
  }

  // Setup automatic token refresh with minimum interval
  private setupTokenRefresh() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Set up new interval
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, MIN_REFRESH_INTERVAL);
  }

  // Check if token needs refresh
  private async checkAndRefreshToken() {
    // Prevent rapid refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshTime < MIN_REFRESH_INTERVAL) {
      return;
    }

    if (!this.isUserActive()) return;

    try {
      await this.refreshToken();
      this.lastRefreshTime = now;
    } catch (error) {
      console.error('Error checking token:', error);
    }
  }

  // Check if user is active
  private isUserActive(): boolean {
    const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0');
    const currentTime = Date.now();
    return currentTime - lastActivity < ACTIVITY_TIMEOUT;
  }

  // Refresh token
  public async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  // Perform actual token refresh
  private async performTokenRefresh(): Promise<void> {
    try {
      await axios.post('/api/auth/refresh-token', {}, {
        withCredentials: true
      });
    } catch (error) {
      this.clearTokens();
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
      throw error;
    }
  }

  // Clear tokens and cleanup
  public clearTokens() {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.activityThrottleTimeout) {
      clearTimeout(this.activityThrottleTimeout);
    }
  }

  // Handle failed requests
  public async handleFailedRequest(error: any): Promise<any> {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      
      try {
        await this.refreshToken();
        return axios(error.config);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
}

// Create a single instance
export const tokenService = new TokenService(); 