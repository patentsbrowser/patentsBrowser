import Razorpay from 'razorpay';
import crypto from 'crypto';
import { SubscriptionPlan } from '../models/Subscription.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Razorpay instance if credentials are available
let razorpay;
try {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  
  if (key_id && key_secret) {
    razorpay = new Razorpay({
      key_id,
      key_secret
    });
  } else {
    console.warn('Razorpay credentials not found in environment variables. Some functions may not work.');
    // Create a mock object for development
    razorpay = {
      customers: {
        create: async () => ({ id: 'mock_customer_id' })
      },
      orders: {
        create: async (options) => ({
          id: 'mock_order_id',
          amount: options.amount,
          currency: options.currency,
          receipt: options.receipt
        })
      }
    };
  }
} catch (error) {
  console.error('Error initializing Razorpay:', error);
}

/**
 * Creates a Razorpay customer
 * @param name - Customer name
 * @param email - Customer email
 * @param phone - Customer phone number
 * @returns Razorpay customer object
 */
export const createCustomer = async (name: string, email: string, phone?: string) => {
  try {
    const customer = await razorpay.customers.create({
      name,
      email,
      contact: phone
    });
    return customer;
  } catch (error) {
    console.error('Error creating Razorpay customer:', error);
    throw error;
  }
};

/**
 * Creates a Razorpay order
 * @param amount - Amount in INR (Paisa)
 * @param receipt - Receipt ID (optional)
 * @param notes - Additional notes (optional)
 * @returns Razorpay order object
 */
export const createOrder = async (amount: number, receipt?: string, notes?: object) => {
  try {
    const options = {
      amount: amount * 100, // Convert to paisa
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
      notes
    };
    
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

/**
 * Verifies Razorpay payment signature
 * @param razorpayOrderId - Razorpay order ID
 * @param razorpayPaymentId - Razorpay payment ID
 * @param razorpaySignature - Razorpay signature
 * @returns Boolean indicating if signature is valid
 */
export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) => {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
    
  return generatedSignature === razorpaySignature;
};

/**
 * Calculate subscription end date based on plan
 * @param plan - Subscription plan
 * @param startDate - Start date (defaults to current date)
 * @returns End date of subscription
 */
export const calculateSubscriptionEndDate = (
  plan: SubscriptionPlan,
  startDate: Date = new Date()
): Date => {
  const endDate = new Date(startDate);
  
  switch (plan) {
    case SubscriptionPlan.MONTHLY:
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case SubscriptionPlan.QUARTERLY:
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case SubscriptionPlan.HALF_YEARLY:
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case SubscriptionPlan.YEARLY:
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1); // Default to 1 month
  }
  
  return endDate;
};

/**
 * Get subscription amount based on plan
 * @param plan - Subscription plan
 * @returns Amount in INR
 */
export const getSubscriptionAmount = (plan: SubscriptionPlan): number => {
  switch (plan) {
    case SubscriptionPlan.MONTHLY:
      return 150;
    case SubscriptionPlan.QUARTERLY:
      return 400;
    case SubscriptionPlan.HALF_YEARLY:
      return 750;
    case SubscriptionPlan.YEARLY:
      return 1200;
    default:
      return 150; // Default to monthly plan
  }
};

export default {
  createCustomer,
  createOrder,
  verifyPaymentSignature,
  calculateSubscriptionEndDate,
  getSubscriptionAmount
}; 