import { Request, Response } from 'express';
import { User } from '../models/User.js';
import Subscription, { SubscriptionPlan, SubscriptionStatus } from '../models/Subscription.js';
import PricingPlan from '../models/PricingPlan.js';
import razorpayService from '../services/razorpayService.js';
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

// Create a Razorpay order for subscription
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

    // Create Razorpay customer if not already created
    if (!user.razorpayCustomerId) {
      const customer = await razorpayService.createCustomer(
        user.name || 'Customer',
        user.email,
        user.number
      );
      
      user.razorpayCustomerId = customer.id;
      await user.save();
    }

    // Create a Razorpay order
    const order = await razorpayService.createOrder(
      plan.price,
      `plan_${plan.type}_${Date.now()}`,
      {
        userId: userId,
        planId: planId,
        planType: plan.type
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        order,
        key: process.env.RAZORPAY_KEY_ID,
        user: {
          name: user.name,
          email: user.email,
          contact: user.number
        }
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

// Create or activate a subscription after payment
export const activateSubscription = async (req: Request, res: Response) => {
  try {
    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      planId
    } = req.body;
    
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify the payment signature
    const isValidSignature = razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
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
    const endDate = razorpayService.calculateSubscriptionEndDate(plan.type as SubscriptionPlan, startDate);

    // Create or update the subscription
    const subscription = await Subscription.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        plan: plan.type,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        razorpayPaymentId,
        razorpaySignature
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
    console.error('Error activating subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Error activating subscription'
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

// Handle Razorpay webhook
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const webhook = req.body;
    const signature = req.headers['x-razorpay-signature'] as string;

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const generated = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhook))
      .digest('hex');

    if (generated !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    // Handle different webhook events
    const event = webhook.event;

    switch (event) {
      case 'payment.captured':
        // Payment was successful
        // Update subscription status
        break;
      case 'payment.failed':
        // Payment failed
        // Update subscription status
        break;
      // Add other relevant events as needed
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing webhook'
    });
  }
};

export default {
  getPricingPlans,
  createSubscriptionOrder,
  activateSubscription,
  startFreeTrial,
  getUserSubscription,
  cancelSubscription,
  handleWebhook
}; 