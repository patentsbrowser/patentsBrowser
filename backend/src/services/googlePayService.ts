import crypto from 'crypto';
import { SubscriptionPlan } from '../models/Subscription.js';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  dotenv.config({ path: '.env.production' });
} else if (env === 'stage') {
  dotenv.config({ path: '.env.stage' });
} else {
  dotenv.config();
}

// UPI configuration
const UPI_ID = process.env.UPI_ID || 'test@upi';
const MERCHANT_NAME = process.env.GOOGLE_PAY_MERCHANT_NAME || 'PatentsBrowser';

/**
 * Generates a unique order ID
 * @returns A unique order ID string
 */
export const generateOrderId = (): string => {
  return `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
};

/**
 * Creates a UPI payment link
 * @param amount - Amount in INR
 * @param orderInfo - Order information
 * @returns UPI payment information
 */
export const createUpiPaymentLink = (
  amount: number,
  orderInfo: {
    orderId: string;
    planId: string;
    planType: string;
    planName: string;
    userId: string;
  }
): {
  upiLink: string;
  orderId: string;
  amount: number;
} => {
  try {
    // Format amount to 2 decimal places
    const formattedAmount = amount.toFixed(2);
    
    // Create transaction note with order ID for reference
    const transactionNote = `${orderInfo.planName} Plan - ${orderInfo.orderId}`;
    
    // Create UPI link
    // pa: UPI ID (payee address)
    // pn: Payee name
    // am: Amount
    // cu: Currency
    // tn: Transaction note
    // tr: Transaction reference ID
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${orderInfo.orderId}`;
    
    return {
      upiLink,
      orderId: orderInfo.orderId,
      amount
    };
  } catch (error) {
    console.error('Error creating UPI payment link:', error);
    throw error;
  }
};

/**
 * Verify UPI transaction reference
 * @param transactionRef - Transaction reference ID provided by user
 * @param orderId - Order ID to match against
 * @returns Boolean indicating if transaction reference is valid
 */
export const verifyUpiTransaction = (
  transactionRef: string,
  orderId: string
): boolean => {
  try {
    // In a real implementation, you would:
    // 1. Check your bank/UPI dashboard for this transaction
    // 2. Verify the amount, order ID, and other details
    // 3. Return true if verified, false otherwise
    
    // For development environment, accept any non-empty transaction reference
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Using mock UPI transaction verification in development');
      return !!transactionRef && transactionRef.length >= 6;
    }
    
    // This is where you'd implement actual verification logic in production
    // For now, we'll accept any transaction reference that's at least 6 characters
    return !!transactionRef && transactionRef.length >= 6;
  } catch (error) {
    console.error('Error verifying UPI transaction:', error);
    return false;
  }
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
      return 999;  // ₹999 for monthly plan
    case SubscriptionPlan.QUARTERLY:
      return 2499; // ₹2,499 for quarterly plan
    case SubscriptionPlan.HALF_YEARLY:
      return 4499; // ₹4,499 for half-yearly plan
    case SubscriptionPlan.YEARLY:
      return 7999; // ₹7,999 for yearly plan
    default:
      return 999; // Default to monthly plan price
  }
};

export default {
  generateOrderId,
  createUpiPaymentLink,
  verifyUpiTransaction,
  calculateSubscriptionEndDate,
  getSubscriptionAmount
}; 