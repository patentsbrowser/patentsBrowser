import axios from 'axios';
// import { getAuthToken } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Cache system to prevent duplicate API calls
interface CachedData {
  data: {
    success: boolean;
    data: any[];
  } | null;
  timestamp: number;
  pendingPromise: Promise<any> | null;
  expiryTime: number;
}

const apiCache: {
  subscriptionPlans: CachedData
} = {
  subscriptionPlans: {
    data: null,
    timestamp: 0,
    pendingPromise: null,
    expiryTime: 5 * 60 * 1000 // 5 minutes cache
  }
};

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
 * Uses caching to prevent duplicate API calls
 */
export const getSubscriptionPlans = async () => {
  debugLog('getSubscriptionPlans called', { 
    cached: !!apiCache.subscriptionPlans.data,
    pendingRequest: !!apiCache.subscriptionPlans.pendingPromise 
  });
  
  const now = Date.now();
  const cache = apiCache.subscriptionPlans;
  
  // If we have cached data that's still valid, return it
  if (cache.data && (now - cache.timestamp) < cache.expiryTime) {
    debugLog('Returning cached subscription plans', { 
      age: now - cache.timestamp,
      plansCount: cache.data.data?.length 
    });
    return cache.data;
  }
  
  // If there's already a request in progress, return that promise to prevent duplicate requests
  if (cache.pendingPromise) {
    debugLog('Returning pending subscription plans request', {});
    return cache.pendingPromise;
  }
  
  try {
    debugLog('Making new API request to /subscriptions/plans', {});
    
    // Store the promise so concurrent calls can use it
    cache.pendingPromise = axiosInstance.get('/subscriptions/plans')
      .then(response => {
        // Update cache with fresh data
        cache.data = response.data;
        cache.timestamp = now;
        debugLog('API response received and cached', { 
          plansCount: response.data.data?.length 
        });
        return response.data;
      })
      .catch(error => {
        console.error('Error fetching subscription plans:', error);
        throw error;
      })
      .finally(() => {
        // Clear the pending promise reference
        cache.pendingPromise = null;
      });
    
    return cache.pendingPromise;
  } catch (error) {
    console.error('Error setting up subscription plans request:', error);
    throw error;
  }
};

/**
 * Create a pending subscription with UPI order ID
 * @param planId - The ID of the plan to subscribe to
 * @param upiOrderId - A unique identifier for this order
 */
export const createPendingSubscription = async (planId: string, upiOrderId: string) => {
  try {
    debugLog('Creating pending subscription', { planId, upiOrderId });
    
    const response = await axiosInstance.post('/subscriptions/create-pending', {
      planId,
      upiOrderId
    });
    
    debugLog('Pending subscription created successfully', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating pending subscription:', error);
    throw error;
  }
};

/**
 * Verify UPI payment using transaction reference ID
 * @param transactionId - UPI transaction reference ID
 */
export const verifyUpiPayment = async (transactionId: string) => {
  try {
    debugLog('Verifying UPI payment', { transactionId });
    
    const response = await axiosInstance.post('/subscriptions/verify-payment', {
      transactionId
    });
    
    debugLog('Payment verification response:', response.data);
    
    // Always return the data as is - the backend now sets the status as 'pending'
    // and requires admin verification for all payments
    return response.data;
  } catch (error: any) {
    console.error('Error verifying UPI payment:', error);
    
    // Properly propagate the backend error message
    if (error.response?.data) {
      throw {
        ...error,
        message: error.response.data.message || 'Payment verification failed'
      };
    }
    
    throw error;
  }
};

/**
 * Get the current user's subscription information
 */
export const getUserSubscription = async () => {
  try {
    debugLog('Getting user subscription', {});
    
    const response = await axiosInstance.get('/subscriptions/user-subscription');
    
    debugLog('User subscription response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
};

/**
 * Check the status of a payment verification
 * @param transactionId - UPI transaction reference ID
 */
export const checkPaymentVerificationStatus = async (transactionId: string) => {
  try {
    // First check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    debugLog('Checking payment verification status', { transactionId });
    
    const response = await axiosInstance.get(`/subscriptions/payment-status/${transactionId}`);
    
    debugLog('Payment verification status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking payment verification status:', error);
    throw error;
  }
};

/**
 * Get the current user's payment history
 */
export const getUserPaymentHistory = async () => {
  try {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    debugLog('Getting user payment history', {});
    
    const response = await axiosInstance.get('/subscriptions/payment-history');
    
    debugLog('User payment history response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting user payment history:', error);
    throw error;
  }
};

export default {
  getSubscriptionPlans,
  createPendingSubscription,
  verifyUpiPayment,
  getUserSubscription,
  checkPaymentVerificationStatus,
  getUserPaymentHistory
}; 