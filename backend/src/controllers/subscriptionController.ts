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
const calculateEndDate = (plan: SubscriptionPlan, trialDaysRemaining: number = 0): Date => {
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
  
  // Add remaining trial days to subscription duration
  if (trialDaysRemaining > 0) {
    endDate.setDate(endDate.getDate() + trialDaysRemaining);
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
    
    // Get user to check trial status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Calculate remaining trial days if user is on trial
    let trialDaysRemaining = 0;
    if (user.subscriptionStatus === SubscriptionStatus.TRIAL && user.trialEndDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const trialEndDate = new Date(user.trialEndDate);
      trialEndDate.setHours(0, 0, 0, 0);
      
      if (trialEndDate > today) {
        const diffTime = trialEndDate.getTime() - today.getTime();
        trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    
    // Calculate end date based on plan type, including any remaining trial days
    const endDate = calculateEndDate(plan.type as SubscriptionPlan, trialDaysRemaining);
    
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
        endDate: subscription.endDate,
        trialDaysAdded: trialDaysRemaining
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
    
    // Store transaction reference ID without verifying immediately
    // Admin will verify this payment manually
    subscription.upiTransactionRef = transactionId;
    await subscription.save();
    
    return res.status(200).json({
      success: true,
      message: 'Payment reference submitted. Admin will verify your payment shortly.',
      data: {
        subscriptionId: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        transactionId: transactionId
      }
    });
  } catch (error) {
    console.error('Error processing payment reference:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing payment reference'
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

// Check payment status by transaction ID
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    
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
    
    // Find subscription with this transaction reference AND for this specific user
    const subscription = await Subscription.findOne({ 
      upiTransactionRef: transactionId,
      userId: userId 
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No payment found with this transaction ID for your account'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        status: subscription.status,
        verifiedAt: subscription.updatedAt
      }
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking payment status'
    });
  }
};

// Get all pending payments (admin only)
export const getPendingPayments = async (req: Request, res: Response) => {
  try {
    // Find all subscriptions with status PAYMENT_PENDING or equivalent unverified status
    const pendingSubscriptions = await Subscription.find({ 
      status: SubscriptionStatus.PAYMENT_PENDING 
    }).populate('userId', 'name email');
    
    // Transform to the expected format
    const payments = await Promise.all(pendingSubscriptions.map(async (sub) => {
      const user = await User.findById(sub.userId);
      const plan = await PricingPlan.findOne({ type: sub.plan });
      
      return {
        id: sub._id,
        userId: sub.userId,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'No Email',
        referenceNumber: sub.upiTransactionRef || 'No Reference',
        amount: plan?.price || 0,
        planName: `${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan`,
        status: 'unverified',
        screenshotUrl: sub.paymentScreenshotUrl,
        createdAt: sub.createdAt,
        orderDetails: {
          orderId: sub.upiOrderId || 'No Order ID',
          planId: plan?._id.toString() || 'Unknown Plan'
        }
      };
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pending payments'
    });
  }
};

// Update payment verification status (admin only)
export const updatePaymentVerification = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { status, notes } = req.body;
    
    if (!paymentId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and status are required'
      });
    }
    
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "verified" or "rejected"'
      });
    }
    
    // Find the subscription
    const subscription = await Subscription.findById(paymentId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Update status based on admin decision
    if (status === 'verified') {
      subscription.status = SubscriptionStatus.ACTIVE;
      
      // Update user's subscription status and always set the most recent reference number
      const updateData: any = { 
        subscriptionStatus: 'paid',
        subscriptionEnd: subscription.endDate,
        notes: notes || undefined
      };
      
      // Only update reference number if it exists in the subscription
      if (subscription.upiTransactionRef) {
        updateData.referenceNumber = subscription.upiTransactionRef;
      }
      
      await User.findByIdAndUpdate(subscription.userId, updateData);
      
    } else {
      subscription.status = SubscriptionStatus.REJECTED;
      
      // Update user's subscription status - change to 'trial'
      await User.findByIdAndUpdate(subscription.userId, { 
        subscriptionStatus: 'trial',
        notes: notes || undefined
      });
    }
    
    // Save verification notes if provided
    if (notes) {
      subscription.notes = notes;
    }
    
    // Save the updated subscription
    await subscription.save();
    
    return res.status(200).json({
      success: true,
      message: `Payment ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      data: {
        paymentId,
        status: subscription.status
      }
    });
  } catch (error) {
    console.error('Error updating payment verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating payment verification'
    });
  }
};

// Export all controller methods
export default {
  getPricingPlans,
  createPendingSubscription,
  verifyUpiPayment,
  getUserSubscription,
  getPaymentStatus,
  getPendingPayments,
  updatePaymentVerification
}; 