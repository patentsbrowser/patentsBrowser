import axios from 'axios';
// import { getAuthToken } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      
      if (token && token !== "undefined") {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('Setting auth token:', `Bearer ${token.substring(0, 10)}...`);
      } else {
        console.warn('No valid auth token found for subscription request');
      }
      return config;
    } catch (error) {
      console.error('Error setting auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add custom debugging to help troubleshoot
const debugLog = (message: string, data: any): void => {
  console.log(`[Subscription Service] ${message}`, data);
};

/**
 * Get all available subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    const response = await axiosInstance.get('/subscriptions/plans');
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

// All other subscription service functions have been removed

export default {
  getSubscriptionPlans
}; 