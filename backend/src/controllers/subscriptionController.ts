import { Request, Response } from 'express';
import { User } from '../models/User.js';
import Subscription, { SubscriptionPlan, SubscriptionStatus } from '../models/Subscription.js';
import PricingPlan from '../models/PricingPlan.js';
import googlePayService from '../services/googlePayService.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Get pricing plans
export const getPricingPlans = async (req: Request, res: Response) => {
  try {
    const plans = await PricingPlan.find().sort({ price: 1 });
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

// Create a UPI payment link for subscription
export const createSubscriptionOrder = async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find the selected plan
    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate a unique order ID
    const orderId = googlePayService.generateOrderId();

    // Get the fixed amount for this plan type
    const planAmount = googlePayService.getSubscriptionAmount(plan.type as SubscriptionPlan);

    // Create a UPI payment link
    const paymentInfo = googlePayService.createUpiPaymentLink(
      planAmount,
      {
        orderId,
        planId: planId,
        planType: plan.type,
        planName: plan.name,
        userId: userId
      }
    );

    // Store pending order in database (optional but recommended)
    // This allows for easier verification later
    const pendingOrder = {
      orderId: orderId,
      planId: planId,
      userId: userId,
      amount: planAmount,
      status: 'pending',
      createdAt: new Date()
    };

    // You could store this in a database collection
    // await PendingOrder.create(pendingOrder);

    return res.status(200).json({
      success: true,
      data: {
        paymentInfo,
        user: {
          name: user.name,
          email: user.email,
          contact: user.number
        },
        plan: {
          name: plan.name,
          type: plan.type,
          amount: planAmount
        },
        orderId: orderId
      }
    });
  } catch (error) {
    console.error('Error creating subscription order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating subscription order'
    });
  }
};

// Verify and activate subscription after UPI payment
export const verifyAndActivateSubscription = async (req: Request, res: Response) => {
  try {
    const {
      transactionRef,
      orderId,
      planId
    } = req.body;
    
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify the transaction reference
    const isValidTransaction = googlePayService.verifyUpiTransaction(
      transactionRef,
      orderId
    );

    if (!isValidTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction reference. Please check and try again.'
      });
    }

    // Find the selected plan
    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    const startDate = new Date();
    const endDate = googlePayService.calculateSubscriptionEndDate(plan.type as SubscriptionPlan, startDate);

    // Create or update the subscription
    const subscription = await Subscription.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        plan: plan.type,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        upiTransactionRef: transactionRef,
        upiOrderId: orderId
      },
      { upsert: true, new: true }
    );

    // Update user subscription status
    await User.findByIdAndUpdate(
      userId,
      {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        paymentStatus: 'paid'
      }
    );

    return res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error verifying and activating subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying and activating subscription'
    });
  }
};

// Start free trial
export const startFreeTrial = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has a subscription
    const existingSubscription = await Subscription.findOne({ userId: user._id });
    if (existingSubscription && existingSubscription.status !== SubscriptionStatus.INACTIVE) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription or trial'
      });
    }

    const startDate = new Date();
    const trialEndDate = new Date(startDate);
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

    // Create a trial subscription
    const subscription = new Subscription({
      userId: user._id,
      plan: SubscriptionPlan.MONTHLY, // Default to monthly for trial
      startDate,
      endDate: trialEndDate,
      status: SubscriptionStatus.TRIAL,
      trialEndsAt: trialEndDate
    });

    await subscription.save();

    // Update user
    user.subscriptionStatus = SubscriptionStatus.TRIAL;
    user.trialEndDate = trialEndDate;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        message: 'Free trial started successfully'
      }
    });
  } catch (error) {
    console.error('Error starting free trial:', error);
    return res.status(500).json({
      success: false,
      message: 'Error starting free trial'
    });
  }
};

// Get user's subscription details
export const getUserSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const subscription = await Subscription.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    return res.status(200).json({
      success: true,
      data: subscription || { status: SubscriptionStatus.INACTIVE }
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user subscription'
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const subscription = await Subscription.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Set cancellation date but allow access until the end of the subscription period
    subscription.cancelledAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      data: {
        message: 'Subscription cancellation processed. Access will remain until the end of the current period.',
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling subscription'
    });
  }
};

// Handle Google Pay webhook
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    // Verify the webhook signature (implementation depends on Google Pay's webhook structure)
    // This is a placeholder - you'll need to implement proper verification

    // Process the event based on its type
    switch (event.type) {
      case 'payment.success':
        // Process successful payment
        // Note: This would be an alternative to the client-side callback
        // You might want to activate the subscription here as well
        break;
      case 'payment.failed':
        // Handle failed payment
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ success: false, message: 'Webhook error' });
  }
};

export default {
  getPricingPlans,
  createSubscriptionOrder,
  verifyAndActivateSubscription,
  startFreeTrial,
  getUserSubscription,
  cancelSubscription,
  handleWebhook
}; 