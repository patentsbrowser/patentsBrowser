import axios from 'axios';
import { getAuthToken } from '../utils/auth';

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
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
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
 * Create a subscription order
 * @param planId - ID of the selected plan
 */
export const createSubscriptionOrder = async (planId: string) => {
  try {
    const response = await axiosInstance.post('/subscriptions/order', { planId });
    return response.data;
  } catch (error) {
    console.error('Error creating subscription order:', error);
    throw error;
  }
};

/**
 * Activate a subscription after successful payment
 * @param paymentData - Payment data from Razorpay
 */
export const activateSubscription = async (paymentData: {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  planId: string;
}) => {
  try {
    const response = await axiosInstance.post('/subscriptions/activate', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error activating subscription:', error);
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
  activateSubscription,
  startFreeTrial,
  getUserSubscription,
  cancelSubscription
}; 