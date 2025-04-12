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

/**
 * Create a subscription order with UPI payment information
 * @param planId - ID of the selected plan
 */
export const createSubscriptionOrder = async (planId: string) => {
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token || token === "undefined") {
      return {
        success: false,
        message: 'You must be logged in to create a subscription'
      };
    }

    const response = await axiosInstance.post('/subscriptions/order', { planId });
    return response.data;
  } catch (error: any) {
    console.error('Error creating subscription order:', error);
    // Extract and return error message from the response if available
    const errorMessage = error.response?.data?.message || 'Failed to create subscription order';
    return {
      success: false,
      message: errorMessage
    };
  }
};

/**
 * Verify and activate subscription after UPI payment
 * @param verifyData - Payment verification data
 */
export const verifyAndActivateSubscription = async (verifyData: {
  transactionRef: string;
  orderId: string;
  planId: string;
}) => {
  try {
    const response = await axiosInstance.post('/subscriptions/verify', verifyData);
    return response.data;
  } catch (error) {
    console.error('Error verifying subscription payment:', error);
    throw error;
  }
};

/**
 * Start a free trial
 */
export const startFreeTrial = async () => {
  try {
    const response = await axiosInstance.post('/subscriptions/trial');
    return response.data;
  } catch (error) {
    console.error('Error starting free trial:', error);
    throw error;
  }
};

/**
 * Get current user's subscription details
 */
export const getUserSubscription = async () => {
  try {
    const response = await axiosInstance.get('/subscriptions/user');
    return response.data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

/**
 * Cancel current subscription
 */
export const cancelSubscription = async () => {
  try {
    const response = await axiosInstance.post('/subscriptions/cancel');
    return response.data;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

export default {
  getSubscriptionPlans,
  createSubscriptionOrder,
  verifyAndActivateSubscription,
  startFreeTrial,
  getUserSubscription,
  cancelSubscription
}; 