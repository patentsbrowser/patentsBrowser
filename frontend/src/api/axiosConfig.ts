import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

// Flag to track if session expiration is already being handled
let isHandlingSessionExpiration = false;

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Enable sending credentials (cookies) with requests
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to add auth token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ensure credentials are sent with every request
    config.withCredentials = true;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle session expiration and network errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors or backend unavailability
    if (!error.response) {
      // Network error or backend is down
      toast.error('Unable to connect to the server. Please try again later.');
      return Promise.reject(error);
    }

    // Handle session expiration and auth errors
    if (
      error.response.status === 401 ||
      error.response.status === 403 ||
      (error.response.data?.code === 'SESSION_EXPIRED' || 
       error.response.data?.code === 'INVALID_TOKEN' ||
       error.response.data?.code === 'AUTH_REQUIRED')
    ) {
      if (!isHandlingSessionExpiration) {
        // Set flag to prevent duplicate handling
        isHandlingSessionExpiration = true;
        
        // Remove auth data from local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show a notification to the user
        const errorMessage = error.response.data?.message || 'Your session has expired. Please log in again.';
        toast.error(errorMessage);
        
        // Redirect to login page - use absolute path to ensure correct navigation
        setTimeout(() => {
          // Clear any pending requests
          axiosInstance.interceptors.request.eject(0);
          axiosInstance.interceptors.response.eject(0);
          
          // Reset the flag
          isHandlingSessionExpiration = false;
          
          // Force redirect to login page
          window.location.replace('/');
        }, 1000); // Small delay to allow toast to be visible
      }
    }
    
    return Promise.reject(error);
  }
);

// Add global error handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.response?.status === 401 || !event.reason?.response) {
    // Prevent the default error handling
    event.preventDefault();
    
    // Handle the error directly
    if (!isHandlingSessionExpiration) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Your session has expired. Please log in again.');
      setTimeout(() => {
        window.location.replace('/');
      }, 1000);
    }
  }
});

// Export a function to reset the handling flag (useful for testing)
export const resetSessionExpirationFlag = () => {
  isHandlingSessionExpiration = false;
};

export default axiosInstance; 