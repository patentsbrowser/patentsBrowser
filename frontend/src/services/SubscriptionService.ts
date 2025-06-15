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
  planType?: string;
}

const apiCache: {
  subscriptionPlans: CachedData
} = {
  subscriptionPlans: {
    data: null,
    timestamp: 0,
    pendingPromise: null,
    expiryTime: 5 * 60 * 1000, // 5 minutes cache
    planType: 'all'
  }
};

// Add auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      
      if (token && token !== "undefined") {
        config.headers['Authorization'] = `Bearer ${token}`;
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
};

/**
 * Get all available subscription plans
 * Uses caching to prevent duplicate API calls
 * @param planType - Optional filter for plan type ('individual' or 'organization')
 */
export const getSubscriptionPlans = async (planType?: string) => {
  debugLog('getSubscriptionPlans called', {
    planType,
    cached: !!apiCache.subscriptionPlans.data,
    pendingRequest: !!apiCache.subscriptionPlans.pendingPromise
  });

  const now = Date.now();
  const cache = apiCache.subscriptionPlans;

  // Create cache key based on plan type
  const cacheKey = planType || 'all';

  // If we have cached data that's still valid and for the same plan type, return it
  if (cache.data && (now - cache.timestamp) < cache.expiryTime && cache.planType === cacheKey) {
    debugLog('Returning cached subscription plans', {
      age: now - cache.timestamp,
      planType: cacheKey,
      plansCount: cache.data.data?.length
    });
    return cache.data;
  }

  // If there's already a request in progress for the same plan type, return that promise
  if (cache.pendingPromise && cache.planType === cacheKey) {
    debugLog('Returning pending subscription plans request', { planType: cacheKey });
    return cache.pendingPromise;
  }

  try {
    debugLog('Making new API request to /subscriptions/plans', { planType });

    // Build query parameters
    const params = planType ? { planType } : {};

    // Store the promise so concurrent calls can use it
    cache.pendingPromise = axiosInstance.get('/subscriptions/plans', { params })
      .then(response => {
        // Update cache with fresh data
        cache.data = response.data;
        cache.timestamp = now;
        cache.planType = cacheKey;
        debugLog('API response received and cached', {
          planType: cacheKey,
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

/**
 * Get additional plans for a subscription
 * @param subscriptionId - The ID of the parent subscription
 */
export const getAdditionalPlans = async (subscriptionId: string) => {
  try {
    debugLog('Fetching additional plans for subscription', { subscriptionId });
    
    const response = await axiosInstance.get(`/subscriptions/additional-plans/${subscriptionId}`);
    
    debugLog('Additional plans fetched successfully', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching additional plans:', error);
    throw error;
  }
};

/**
 * Stack a new plan on top of existing subscription
 * @param planId - The ID of the plan to stack
 * @param upiOrderId - A unique identifier for this order
 */
export const stackNewPlan = async (planId: string, upiOrderId: string) => {
  try {
    debugLog('Stacking new plan', { planId, upiOrderId });
    
    const response = await axiosInstance.post('/subscriptions/stack-plan', {
      planId,
      upiOrderId
    });
    
    debugLog('Plan stacked successfully', response.data);
    return response.data;
  } catch (error) {
    console.error('Error stacking new plan:', error);
    throw error;
  }
};

/**
 * Get all stacked plans for the current user
 */
export const getStackedPlans = async () => {
  try {
    debugLog('Getting stacked plans', {});
    
    const response = await axiosInstance.get('/subscriptions/stacked-plans');
    
    debugLog('Stacked plans response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting stacked plans:', error);
    throw error;
  }
};

/**
 * Get total subscription benefits across all stacked plans
 */
export const getTotalSubscriptionBenefits = async () => {
  try {
    debugLog('Getting total subscription benefits', {});
    
    const response = await axiosInstance.get('/subscriptions/total-benefits');
    
    debugLog('Total benefits response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting total subscription benefits:', error);
    throw error;
  }
};

/**
 * Get user-specific subscription plans based on user type
 */
export const getUserSpecificPlans = async () => {
  try {
    debugLog('Getting user-specific plans', {});

    const response = await axiosInstance.get('/subscriptions/plans/user-specific');

    debugLog('User-specific plans response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting user-specific plans:', error);
    throw error;
  }
};

export default {
  getSubscriptionPlans,
  createPendingSubscription,
  verifyUpiPayment,
  getUserSubscription,
  checkPaymentVerificationStatus,
  getUserPaymentHistory,
  getAdditionalPlans,
  stackNewPlan,
  getStackedPlans,
  getTotalSubscriptionBenefits,
  getUserSpecificPlans
};