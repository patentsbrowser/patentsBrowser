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

// Google Pay configuration
const MERCHANT_ID = process.env.GOOGLE_PAY_MERCHANT_ID;
const MERCHANT_NAME = process.env.GOOGLE_PAY_MERCHANT_NAME || 'PatentsBrowser';
const GOOGLE_PAY_API_KEY = process.env.GOOGLE_PAY_API_KEY;

/**
 * Generates a unique order ID
 * @returns A unique order ID string
 */
export const generateOrderId = (): string => {
  return `order_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
};

/**
 * Creates a Google Pay deep link
 * @param amount - Amount in INR
 * @param orderInfo - Order information
 * @returns Google Pay deep link URL
 */
export const createGooglePayDeepLink = async (
  amount: number,
  orderInfo: {
    orderId: string;
    planId: string;
    planType: string;
    userId: string;
    description?: string;
  }
) => {
  try {
    // The transaction ID must be unique for each payment request
    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Create a Google Pay deep link URL
    // Reference: https://developers.google.com/pay/api/web/guides/deep-linking
    const baseUrl = 'https://pay.google.com/gp/v/pay';
    
    // Create payload for the deep link
    const deepLinkPayload = {
      apiVersion: 2,
      apiVersionMinor: 0,
      merchantInfo: {
        merchantId: MERCHANT_ID,
        merchantName: MERCHANT_NAME
      },
      transactionInfo: {
        totalPrice: amount.toFixed(2),
        totalPriceStatus: 'FINAL',
        currencyCode: 'INR',
        countryCode: 'IN',
        transactionId: transactionId,
        transactionNote: orderInfo.description || `Subscription: ${orderInfo.planType}`
      },
      callbackUrl: `${process.env.FRONTEND_URL}/subscription/callback`,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['VISA', 'MASTERCARD']
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'example',
            gatewayMerchantId: MERCHANT_ID || 'exampleGatewayMerchantId'
          }
        }
      }],
      // Add order details in the payment data
      paymentDataRequest: {
        orderInfo: orderInfo
      }
    };

    // Encode the payload
    const encodedPayload = encodeURIComponent(JSON.stringify(deepLinkPayload));
    
    return {
      deepLink: `${baseUrl}?pa=${encodedPayload}`,
      orderId: orderInfo.orderId,
      transactionId: transactionId,
      amount: amount
    };
  } catch (error) {
    console.error('Error creating Google Pay deep link:', error);
    throw error;
  }
};

/**
 * Verifies the payment status from Google Pay
 * @param paymentData - Payment data from Google Pay
 * @returns Boolean indicating if payment is valid
 */
export const verifyPayment = (
  paymentData: {
    orderId: string;
    transactionId: string;
    paymentId: string;
    signature: string;
  }
) => {
  try {
    // In a real implementation, you would verify the signature with Google Pay
    // This is a simplified version for demonstration purposes
    
    // If API key not available in development, always return true for testing
    if (!GOOGLE_PAY_API_KEY && process.env.NODE_ENV !== 'production') {
      console.warn('Using mock signature verification in development');
      return true;
    }
    
    // In production, implement actual verification logic
    // This would typically involve calling Google Pay API to verify the payment
    
    return true;
  } catch (error) {
    console.error('Error verifying payment:', error);
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
  generateOrderId,
  createGooglePayDeepLink,
  verifyPayment,
  calculateSubscriptionEndDate,
  getSubscriptionAmount
}; 