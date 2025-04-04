import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

// Flag to track if session expiration is already being handled
let isHandlingSessionExpiration = false;

const axiosInstance = axios.create({
  baseURL: API_URL
});

// Add a request interceptor to add auth token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle session expiration
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle session expiration
    if (
      error.response && 
      error.response.status === 401 &&
      (error.response.data?.code === 'SESSION_EXPIRED' || error.response.data?.code === 'INVALID_TOKEN') &&
      !isHandlingSessionExpiration
    ) {
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
        window.location.href = '/';
        // Reset the flag after navigation (though this won't execute in most cases due to page reload)
        isHandlingSessionExpiration = false;
      }, 1000); // Small delay to allow toast to be visible
    }
    
    return Promise.reject(error);
  }
);

// Export a function to reset the handling flag (useful for testing)
export const resetSessionExpirationFlag = () => {
  isHandlingSessionExpiration = false;
};

export default axiosInstance; 