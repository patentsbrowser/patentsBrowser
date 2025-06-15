import axios from 'axios';
import { Plan, Subscription, UserSubscription, PlanChangeRequest, PaymentVerification } from '../types/subscription';
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
  async (config) => {
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
 * Request a plan change (upgrade or downgrade)
 * @param newPlan - The ID of the new plan to change to
 */
export const requestPlanChange = async (newPlan: string) => {
  try {
    debugLog('Requesting plan change', { newPlan });
    
    const response = await axiosInstance.post('/subscriptions/change-plan', {
      newPlan
    });
    
    debugLog('Plan change request response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error requesting plan change:', error);
    throw error;
  }
};

/**
 * Verify payment for a plan upgrade
 * @param subscriptionId - The ID of the subscription to verify
 * @param transactionId - UPI transaction reference ID
 * @param paymentScreenshotUrl - URL of the payment screenshot
 */
export const verifyPlanChangePayment = async (
  subscriptionId: string,
  transactionId: string,
  paymentScreenshotUrl: string
) => {
  try {
    debugLog('Verifying plan change payment', { subscriptionId, transactionId });
    
    const response = await axiosInstance.post('/subscriptions/verify-plan-change', {
      subscriptionId,
      upiTransactionRef: transactionId,
      paymentScreenshotUrl
    });
    
    debugLog('Plan change payment verification response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error verifying plan change payment:', error);
    throw error;
  }
};

class SubscriptionService {
  async getPlans(accountType?: 'individual' | 'organization'): Promise<Plan[]> {
    const params = accountType ? { accountType } : {};
    try {
      // For landing page, we don't need authentication
      const response = await axios.get(`${API_URL}/subscriptions/plans`, {
        params
      });
      console.log('Plans API response:', response.data);
      return response.data.data || response.data; // Handle different response formats
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  }

  async getUserPlans(): Promise<Plan[]> {
    try {
      const response = await axios.get(`${API_URL}/subscriptions/user-plans`, {
        headers: await this.getAuthHeader()
      });
      console.log('getUserPlans API response:', response.data);
      return response.data.data || response.data || []; // Handle different response formats
    } catch (error) {
      console.error('Error fetching user plans:', error);
      throw error;
    }
  }

  async getUserSubscription(): Promise<UserSubscription> {
    const response = await axios.get(`${API_URL}/subscriptions/user-subscription`, {
      headers: await this.getAuthHeader()
    });
    return response.data;
  }

  async subscribe(planId: string, paymentDetails: {
    transactionId: string;
    paymentScreenshotUrl?: string;
  }): Promise<Subscription> {
    const response = await axios.post(
      `${API_URL}/subscriptions/subscribe`,
      { planId, ...paymentDetails },
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async requestPlanChange(request: PlanChangeRequest): Promise<{
    subscription: Subscription;
    proratedAmount?: number;
    effectiveDate?: string;
  }> {
    const response = await axios.post(
      `${API_URL}/subscriptions/change-plan`,
      request,
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async verifyPlanChangePayment(verification: PaymentVerification): Promise<Subscription> {
    const response = await axios.post(
      `${API_URL}/subscriptions/verify-plan-change`,
      verification,
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async cancelSubscription(): Promise<Subscription> {
    const response = await axios.post(
      `${API_URL}/subscriptions/cancel`,
      {},
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async getStackedPlans(): Promise<Subscription[]> {
    const response = await axios.get(
      `${API_URL}/subscriptions/stacked`,
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async getTotalBenefits(): Promise<{
    maxSearches: number;
    maxExports: number;
    maxSavedPatents: number;
    additionalFeatures: string[];
  }> {
    const response = await axios.get(
      `${API_URL}/subscriptions/benefits`,
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async verifyPayment(verification: PaymentVerification): Promise<Subscription> {
    const response = await axios.post(
      `${API_URL}/subscriptions/verify-payment`,
      verification,
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async getPaymentStatus(subscriptionId: string): Promise<{
    status: 'pending' | 'verified' | 'rejected';
    message?: string;
  }> {
    const response = await axios.get(
      `${API_URL}/subscriptions/payment-status/${subscriptionId}`,
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  async getOrganizationDetails(): Promise<{
    name: string;
    size: string;
    type: string;
    memberCount: number;
    role: 'admin' | 'member';
  }> {
    const response = await axios.get(
      `${API_URL}/organizations/details`,
      { headers: await this.getAuthHeader() }
    );
    return response.data;
  }

  private async getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService; 