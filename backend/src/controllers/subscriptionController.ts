import { Request, Response } from 'express';
import PricingPlan from '../models/PricingPlan.js';
import Subscription, { SubscriptionPlan, SubscriptionStatus } from '../models/Subscription.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

// Simple in-memory cache to minimize database queries
let plansCache = {
  data: null as any[] | null,
  timestamp: 0
};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Get all pricing plans
export const getPricingPlans = async (req: Request, res: Response) => {
  
  try {
    const now = Date.now();

    // Check if we have a valid cache
    if (plansCache.data && (now - plansCache.timestamp) < CACHE_EXPIRY) {
      console.log('Returning cached pricing plans');
      
      return res.status(200).json({
        success: true,
        data: plansCache.data
      });
    }

    // If no valid cache, fetch from database
    console.log('Fetching pricing plans from database');
    const plans = await PricingPlan.find({}).sort({ price: 1 });
    
    // Update cache
    plansCache = {
      data: plans,
      timestamp: now
    };
    
    console.log(`Returning ${plans.length} pricing plans from database`);
    
    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pricing plans'
    });
  }
};

// Calculate subscription end date based on plan
const calculateEndDate = (plan: SubscriptionPlan): Date => {
  const endDate = new Date();
  
  switch(plan) {
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
      endDate.setMonth(endDate.getMonth() + 1);
  }
  
  return endDate;
};

// Create or update a pending subscription with UPI order ID
export const createPendingSubscription = async (req: Request, res: Response) => {
  try {
    const { planId, upiOrderId } = req.body;
    
    if (!planId || !upiOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and UPI Order ID are required'
      });
    }
    
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Get plan details
    const plan = await PricingPlan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Calculate end date based on plan type
    const endDate = calculateEndDate(plan.type as SubscriptionPlan);
    
    // Check if user already has a subscription
    let subscription = await Subscription.findOne({ userId });
    
    if (subscription) {
      // Update existing subscription
      subscription.plan = plan.type as SubscriptionPlan;
      subscription.startDate = new Date();
      subscription.endDate = endDate;
      subscription.status = SubscriptionStatus.PAYMENT_PENDING;
      subscription.upiOrderId = upiOrderId;
      subscription.upiTransactionRef = undefined;
    } else {
      // Create new subscription
      subscription = new Subscription({
        userId,
        plan: plan.type,
        startDate: new Date(),
        endDate,
        status: SubscriptionStatus.PAYMENT_PENDING,
        upiOrderId
      });
    }
    
    await subscription.save();
    
    return res.status(200).json({
      success: true,
      message: 'Pending subscription created',
      data: {
        subscriptionId: subscription._id,
        plan: plan.name,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error creating pending subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating pending subscription'
    });
  }
};

// Verify UPI payment and activate subscription
export const verifyUpiPayment = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }
    
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Check if transaction ID has already been used in any subscription
    const existingTransaction = await Subscription.findOne({ 
      upiTransactionRef: transactionId 
    });
    
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'This transaction ID has already been used'
      });
    }
    
    // Find user's pending subscription
    const subscription = await Subscription.findOne({ 
      userId, 
      status: SubscriptionStatus.PAYMENT_PENDING 
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No pending subscription found'
      });
    }
    
    // In a real-world scenario, you would verify the transaction with your bank or UPI provider here
    // For demonstration, we'll implement a simple verification
    
    // Optional: Validate transaction ID format (assuming UPI transaction IDs have a specific format)
    const transactionIdRegex = /^[A-Za-z0-9]{10,25}$/;
    if (!transactionIdRegex.test(transactionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }
    
    // Make an API call to your payment gateway to verify the transaction
    // This is a placeholder - you need to replace with actual payment gateway API call
    try {
      // In production, you would call your payment gateway API here:
      // const verificationResult = await paymentGateway.verifyTransaction(transactionId, subscription.upiOrderId);
      
      // For now, we'll simulate a successful verification
      const verificationResult = {
        success: true,
        verified: true,
        amount: 0, // In production, you would verify this matches the plan price
        // Add other verification fields as needed
      };
      
      if (!verificationResult.verified) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed. Transaction ID is invalid.'
        });
      }
      
      // Update subscription status
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.upiTransactionRef = transactionId;
      await subscription.save();
      
      // Update user's subscription status
      await User.findByIdAndUpdate(userId, { 
        subscriptionStatus: 'paid',
        subscriptionEnd: subscription.endDate
      });
      
      return res.status(200).json({
        success: true,
        message: 'Subscription activated successfully',
        data: {
          subscriptionId: subscription._id,
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate
        }
      });
    } catch (verificationError) {
      console.error('Error verifying payment with gateway:', verificationError);
      return res.status(400).json({
        success: false,
        message: 'Failed to verify payment with payment gateway'
      });
    }
  } catch (error) {
    console.error('Error verifying UPI payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
};

// Get user's current subscription
export const getUserSubscription = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const subscription = await Subscription.findOne({ 
      userId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }
    }).sort({ createdAt: -1 });
    
    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }
    
    // Get plan details
    const plan = await PricingPlan.findOne({ type: subscription.plan });
    
    return res.status(200).json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        plan: subscription.plan,
        planName: plan ? plan.name : subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isActive: new Date() <= subscription.endDate && 
                  (subscription.status === SubscriptionStatus.ACTIVE || 
                   subscription.status === SubscriptionStatus.TRIAL)
      }
    });
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching subscription details'
    });
  }
};

// Export all controller methods
export default {
  getPricingPlans,
  createPendingSubscription,
  verifyUpiPayment,
  getUserSubscription
}; 