import { Request, Response } from 'express';
import PricingPlan, { AccountType } from '../models/PricingPlan.js';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../models/Subscription.js';
import { User } from '../models/User.js';
import Payment from '../models/Payment.js';

// Simple in-memory cache to minimize database queries
let plansCache = {
  individual: null as any[] | null,
  organization: null as any[] | null,
  landing: null as any[] | null,
  timestamp: 0
};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Get pricing plans based on account type
export const getPricingPlans = async (req: Request, res: Response) => {
  try {
    const { accountType } = req.query;
    const now = Date.now();

    // Validate account type
    if (accountType && !Object.values(AccountType).includes(accountType as AccountType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account type. Must be "individual" or "organization"'
      });
    }

    // Check if we have a valid cache for the requested account type
    const cacheKey = accountType as AccountType || 'landing';
    if (plansCache[cacheKey] && (now - plansCache.timestamp) < CACHE_EXPIRY) {
      return res.status(200).json({
        success: true,
        data: plansCache[cacheKey]
      });
    }

    // Build query based on account type
    let query: any = { isActive: true };
    if (accountType) {
      query.accountType = accountType;
    }

    // Fetch plans from database
    const plans = await PricingPlan.find(query).sort({ price: 1 });
    
    // Update cache
    if (accountType) {
      plansCache[accountType as AccountType] = plans;
    } else {
      plansCache.landing = plans;
    }
    plansCache.timestamp = now;
    
    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching pricing plans'
    });
  }
};

// Get pricing plans for authenticated user (based on their account type)
export const getUserPricingPlans = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Get user to determine account type
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Organization members cannot view or purchase plans
    if (user.userType === 'organization_member') {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Organization members cannot purchase individual plans',
        userType: user.userType
      });
    }

    // Determine account type based on user's userType
    let accountType = AccountType.INDIVIDUAL;
    if (user.userType === 'organization_admin') {
      accountType = AccountType.ORGANIZATION;
    }

    // Get plans for the user's account type
    const plans = await PricingPlan.find({ 
      accountType, 
      isActive: true 
    }).sort({ price: 1 });
    
    return res.status(200).json({
      success: true,
      data: plans,
      accountType,
      userType: user.userType
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching user pricing plans'
    });
  }
};

// Get all plans for landing page (both individual and organization)
export const getLandingPagePlans = async (req: Request, res: Response) => {
  try {
    const now = Date.now();

    // Check if we have a valid cache
    if (plansCache.landing && (now - plansCache.timestamp) < CACHE_EXPIRY) {
      return res.status(200).json({
        success: true,
        data: plansCache.landing
      });
    }

    // Fetch all active plans
    const allPlans = await PricingPlan.find({ isActive: true }).sort({ price: 1 });
    
    // Group plans by account type
    const individualPlans = allPlans.filter(plan => plan.accountType === AccountType.INDIVIDUAL);
    const organizationPlans = allPlans.filter(plan => plan.accountType === AccountType.ORGANIZATION);
    
    // Update cache
    plansCache.landing = allPlans;
    plansCache.timestamp = now;
    
    return res.status(200).json({
      success: true,
      data: {
        individual: individualPlans,
        organization: organizationPlans
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching landing page plans'
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

/**
 * Subscription Stacking Logic
 * 
 * When a user purchases a new plan while already having an active subscription:
 * 
 * 1. Creation Phase (createPendingSubscription or stackNewPlan):
 *    - A new subscription record is created with parentSubscriptionId referencing the existing subscription
 *    - The status is set to PAYMENT_PENDING
 *    - Regular start/end dates are set based on the plan type
 * 
 * 2. Verification Phase (verifyPayment):
 *    - When admin verifies the payment, we check if it's a stacked plan
 *    - For stacked plans, we use the parent subscription's end date as the start date
 *    - The end date is calculated based on the plan type from the new start date
 *    - This ensures plans are properly stacked one after another
 *    - User's subscription end date is set to the latest end date among all active subscriptions
 * 
 * This approach ensures that:
 * 1. Plans are correctly stacked in sequence
 * 2. Expiry dates are correctly calculated to reflect the total subscription period
 * 3. The user's account reflects the latest expiry date from all active subscriptions
 */

// Create pending subscription
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

    // Check if plan is active
    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This plan is currently not available'
      });
    }
    
    // Get user to check trial status and account type
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate account type compatibility
    const userAccountType = user.isOrganization ? AccountType.ORGANIZATION : AccountType.INDIVIDUAL;
    
    if (plan.accountType !== userAccountType) {
      return res.status(400).json({
        success: false,
        message: `This plan is only available for ${plan.accountType} accounts. Your account type is ${userAccountType}.`
      });
    }

    // Check if user is organization member (not admin) - they shouldn't purchase plans
    if (user.isOrganization && user.organizationRole === 'member') {
      return res.status(403).json({
        success: false,
        message: 'Organization members cannot purchase plans directly. Please contact your organization admin.'
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
    const startDate = new Date();
    
    // Check if user already has a subscription
    let existingSubscription = await Subscription.findOne({ 
      userId,
      status: SubscriptionStatus.ACTIVE 
    });
    
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Please use the stack plan feature to add additional time.'
      });
    }
    
    // Create new subscription
    const subscription = new Subscription({
      userId,
      plan: plan.type,
      startDate,
      endDate,
      status: SubscriptionStatus.PAYMENT_PENDING,
      upiOrderId,
      amount: plan.price,
      isPendingPayment: true
    });
    
    await subscription.save();
    
    // Update user's pending payment status
    await User.findByIdAndUpdate(userId, {
      isPendingPayment: true
    });
    
    return res.status(201).json({
      success: true,
      message: 'Pending subscription created successfully',
      data: {
        subscriptionId: subscription._id,
        plan: plan.name,
        planType: plan.type,
        accountType: plan.accountType,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: plan.price,
        features: plan.features
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
    }).populate('userId');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No pending subscription found'
      });
    }
    
    // Get plan details
    const plan = await PricingPlan.findOne({ type: subscription.plan });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Optional: Validate transaction ID format (assuming UPI transaction IDs have a specific format)
    const transactionIdRegex = /^[A-Za-z0-9]{10,25}$/;
    if (!transactionIdRegex.test(transactionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }
    
    // Update subscription with transaction reference
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        upiTransactionRef: transactionId,
        amount: plan.price,
        isPendingPayment: true
      },
      { new: true }
    );
    
    // Create a pending payment record
    const payment = new Payment({
      userId: subscription.userId,
      amount: plan.price,
      currency: 'INR',
      status: 'unverified',
      referenceNumber: transactionId,
      plan: subscription.plan,
      paymentDate: new Date(),
      planName: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan`,
      userSubscriptionStatus: subscription.userId.subscriptionStatus,
      orderDetails: {
        orderId: subscription.upiOrderId,
        planId: plan._id
      }
    });
    await payment.save();
    
    // Update user's pending payment status
    await User.findByIdAndUpdate(userId, {
      isPendingPayment: true,
      referenceNumber: transactionId
    });
    
    return res.status(200).json({
      success: true,
      message: 'Payment reference submitted. Admin will verify your payment shortly.',
      data: {
        subscriptionId: updatedSubscription._id,
        plan: plan.name,
        status: updatedSubscription.status,
        transactionId: transactionId,
        amount: plan.price
      }
    });
  } catch (error) {
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

    // Check for pending payments first
    const pendingSubscription = await Subscription.findOne({ 
      userId,
      status: SubscriptionStatus.PAYMENT_PENDING 
    });

    // If there's a pending payment, return trial data
    if (pendingSubscription) {
      return res.status(200).json({
        success: true,
        data: {
          subscriptionId: pendingSubscription._id,
          plan: 'trial',
          planName: 'Trial',
          status: 'trial',
          startDate: user.createdAt,
          endDate: user.trialEndDate,
          isActive: new Date() <= user.trialEndDate,
          isPendingPayment: true,
          trialDaysRemaining
        }
      });
    }
    
    // If no pending payment, get active subscription
    const subscription = await Subscription.findOne({ 
      userId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }
    }).sort({ createdAt: -1 });
    
    // If no active subscription but user is on trial, return trial data
    if (!subscription && user.subscriptionStatus === SubscriptionStatus.TRIAL) {
      return res.status(200).json({
        success: true,
        data: {
          subscriptionId: user._id,
          plan: 'trial',
          planName: 'Trial',
          status: 'trial',
          startDate: user.createdAt,
          endDate: user.trialEndDate,
          isActive: new Date() <= user.trialEndDate,
          isPendingPayment: false,
          trialDaysRemaining
        }
      });
    }
    
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
                   subscription.status === SubscriptionStatus.TRIAL),
        trialDaysRemaining: subscription.status === SubscriptionStatus.TRIAL ? trialDaysRemaining : 0
      }
    });
  } catch (error) {
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
    return res.status(500).json({
      success: false,
      message: 'Error fetching pending payments'
    });
  }
};

// Update payment verification status (admin only)
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { status, notes, subscriptionStatus } = req.body;
    const adminId = req.user?._id;

    // Find the subscription with this payment ID
    const subscription = await Subscription.findById(paymentId);
    if (!subscription) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Payment not found',
        data: null
      });
    }

    // Get the user and plan details
    const user = await User.findById(subscription.userId);
    const plan = await PricingPlan.findOne({ type: subscription.plan });

    if (!user || !plan) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User or plan not found',
        data: null
      });
    }

    // Map frontend status to SubscriptionStatus enum
    let mappedStatus: SubscriptionStatus;
    switch (status) {
      case 'verified':
        mappedStatus = SubscriptionStatus.ACTIVE;
        break;
      case 'rejected':
        mappedStatus = SubscriptionStatus.REJECTED;
        break;
      case 'cancelled':
        mappedStatus = SubscriptionStatus.CANCELLED;
        break;
      case 'inactive':
        mappedStatus = SubscriptionStatus.INACTIVE;
        break;
      default:
        return res.status(400).json({
          statusCode: 400,
          message: 'Invalid status value',
          data: null
        });
    }

    // Calculate subscription dates based on plan
    let startDate = new Date();
    let endDate = new Date();
    
    // Check if this is a stacked plan (has parentSubscriptionId)
    if (subscription.parentSubscriptionId && mappedStatus === SubscriptionStatus.ACTIVE) {
      // Get the parent subscription
      const parentSubscription = await Subscription.findById(subscription.parentSubscriptionId);
      
      if (parentSubscription && parentSubscription.status === SubscriptionStatus.ACTIVE) {
        // Use the parent subscription's end date as the start date for the calculation
        startDate = parentSubscription.endDate;
        
        // Set subscription duration based on plan type
        switch (subscription.plan.toLowerCase()) {
          case 'monthly':
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            break;
          case 'quarterly':
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 3);
            break;
          case 'yearly':
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
          default:
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1); // Default to monthly
        }
      }
    } else {
      // Set subscription duration based on plan type for non-stacked plans
      switch (subscription.plan.toLowerCase()) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1); // Default to monthly
      }
    }

    // Update subscription status and dates
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      paymentId,
      {
        status: mappedStatus,
        notes: notes,
        verifiedBy: adminId,
        verificationDate: new Date(),
        startDate: startDate,
        endDate: endDate,
        isPendingPayment: false,
        amount: plan.price
      },
      { new: true }
    );

    // Create a payment record
    if (mappedStatus === SubscriptionStatus.ACTIVE) {
      const payment = new Payment({
        userId: subscription.userId,
        amount: plan.price,
        currency: 'INR',
        status: 'verified',
        referenceNumber: subscription.upiTransactionRef,
        plan: subscription.plan,
        paymentDate: new Date(),
        verificationDate: new Date(),
        verifiedBy: adminId,
        verificationNotes: notes,
        planName: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan`,
        userSubscriptionStatus: 'active',
        orderDetails: {
          orderId: subscription.upiOrderId,
          planId: plan._id
        }
      });
      await payment.save();

      // Get all active subscriptions for this user to calculate the final end date
      const allUserSubscriptions = await Subscription.find({
        userId: subscription.userId,
        status: SubscriptionStatus.ACTIVE
      }).sort({ endDate: -1 });
      
      // The subscription with the latest end date determines the user's subscription end date
      const latestSubscription = allUserSubscriptions[0];
      const latestEndDate = latestSubscription ? latestSubscription.endDate : endDate;

      // Update user's subscription details
      await User.findByIdAndUpdate(
        subscription.userId,
        {
          subscriptionStatus: 'active',
          subscriptionStartDate: startDate,
          subscriptionEndDate: latestEndDate,
          isPendingPayment: false,
          currentPlan: subscription.plan,
          paymentStatus: 'paid',
          referenceNumber: subscription.upiTransactionRef
        }
      );
    } else if (mappedStatus === SubscriptionStatus.REJECTED) {
      // Create rejected payment record
      const payment = new Payment({
        userId: subscription.userId,
        amount: plan.price,
        currency: 'INR',
        status: 'rejected',
        referenceNumber: subscription.upiTransactionRef,
        plan: subscription.plan,
        paymentDate: new Date(),
        rejectionDate: new Date(),
        rejectedBy: adminId,
        rejectionReason: notes,
        planName: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan`,
        userSubscriptionStatus: 'inactive',
        orderDetails: {
          orderId: subscription.upiOrderId,
          planId: plan._id
        }
      });
      await payment.save();

      // Update user status to inactive
      await User.findByIdAndUpdate(
        subscription.userId,
        {
          subscriptionStatus: 'inactive',
          isPendingPayment: false,
          paymentStatus: 'free'
        }
      );
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Payment status updated successfully',
      data: updatedSubscription
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Error verifying payment',
      data: null
    });
  }
};

// Get user's payment history
export const getUserPaymentHistory = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Find all subscriptions for this user
    const subscriptions = await Subscription.find({ 
      userId,
      upiTransactionRef: { $exists: true, $ne: null } // Only include subscriptions with a transaction reference
    }).sort({ createdAt: -1 }); // Sort by most recent first
    
    // Transform to the expected format
    const paymentHistory = await Promise.all(subscriptions.map(async (sub) => {
      const plan = await PricingPlan.findOne({ type: sub.plan });
      
      return {
        id: sub._id,
        amount: plan?.price || 0,
        currency: "₹",
        planName: `${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan`,
        planDuration: sub.plan,
        referenceNumber: sub.upiTransactionRef || 'No Reference',
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        transactionDate: sub.createdAt,
        orderId: sub.upiOrderId || 'No Order ID',
        adminMessage: sub.notes,
        parentSubscriptionId: sub.parentSubscriptionId || null,
        isStacked: !!sub.parentSubscriptionId
      };
    }));
    
    return res.status(200).json({
      success: true,
      data: paymentHistory
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
};

// Get additional plans for a subscription
export const getAdditionalPlans = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
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
    
    // Find all additional plans for this subscription
    const additionalPlans = await Subscription.find({
      parentSubscriptionId: subscriptionId,
      userId,
      status: SubscriptionStatus.ACTIVE
    }).populate('plan');
    
    return res.status(200).json({
      success: true,
      data: additionalPlans
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching additional plans'
    });
  }
};

// Pause subscription
export const pauseSubscription = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = req.user?._id;

    // Find the user's active subscription
    const subscription = await Subscription.findOne({
      userId,
      status: SubscriptionStatus.ACTIVE
    });

    if (!subscription) {
      return res.status(404).json({
        statusCode: 404,
        message: 'No active subscription found for this user',
        data: null
      });
    }

    // Update subscription status to inactive
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        status: SubscriptionStatus.INACTIVE,
        notes: 'Subscription paused by admin',
        verifiedBy: adminId,
        verificationDate: new Date()
      },
      { new: true }
    );

    // Update user's subscription status
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'inactive'
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Subscription paused successfully',
      data: updatedSubscription
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Error pausing subscription',
      data: null
    });
  }
};

// Enable subscription
export const enableSubscription = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = req.user?._id;

    // Find the user's inactive subscription
    const subscription = await Subscription.findOne({
      userId,
      status: SubscriptionStatus.INACTIVE
    });

    if (!subscription) {
      return res.status(404).json({
        statusCode: 404,
        message: 'No inactive subscription found for this user',
        data: null
      });
    }

    // Calculate remaining time from original end date
    const now = new Date();
    const originalEndDate = subscription.endDate;
    const timeRemaining = originalEndDate.getTime() - now.getTime();
    
    // If subscription has expired, return error
    if (timeRemaining <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Subscription has expired. Please create a new subscription.',
        data: null
      });
    }

    // Update subscription status to active
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        status: SubscriptionStatus.ACTIVE,
        notes: 'Subscription enabled by admin',
        verifiedBy: adminId,
        verificationDate: new Date()
      },
      { new: true }
    );

    // Update user's subscription status
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'active'
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Subscription enabled successfully',
      data: updatedSubscription
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Error enabling subscription',
      data: null
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = req.user?._id;

    // Find the user's active or inactive subscription
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.INACTIVE] }
    });

    if (!subscription) {
      return res.status(404).json({
        statusCode: 404,
        message: 'No active or inactive subscription found for this user',
        data: null
      });
    }

    // Update subscription status to cancelled
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        status: SubscriptionStatus.CANCELLED,
        notes: 'Subscription cancelled by admin',
        verifiedBy: adminId,
        verificationDate: new Date(),
        cancelledAt: new Date()
      },
      { new: true }
    );

    // Update user's subscription status
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'inactive',
      paymentStatus: 'free'
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Subscription cancelled successfully',
      data: updatedSubscription
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Error cancelling subscription',
      data: null
    });
  }
};

/**
 * Stack a new plan on top of existing subscription
 */
export const stackNewPlan = async (req: Request, res: Response) => {
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

    // Check if plan is active
    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This plan is currently not available'
      });
    }
    
    // Get user to check account type
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate account type compatibility
    const userAccountType = user.isOrganization ? AccountType.ORGANIZATION : AccountType.INDIVIDUAL;
    
    if (plan.accountType !== userAccountType) {
      return res.status(400).json({
        success: false,
        message: `This plan is only available for ${plan.accountType} accounts. Your account type is ${userAccountType}.`
      });
    }

    // Check if user is organization member (not admin) - they shouldn't purchase plans
    if (user.isOrganization && user.organizationRole === 'member') {
      return res.status(403).json({
        success: false,
        message: 'Organization members cannot purchase plans directly. Please contact your organization admin.'
      });
    }
    
    // Find user's active subscription
    const existingSubscription = await Subscription.findOne({ 
      userId,
      status: SubscriptionStatus.ACTIVE 
    });
    
    if (!existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found to stack upon'
      });
    }
    
    // Calculate end date based on plan type - this will be updated during verification
    const endDate = calculateEndDate(plan.type as SubscriptionPlan);
    const startDate = new Date();
    
    // Create new stacked subscription
    const stackedSubscription = new Subscription({
      userId,
      plan: plan.type,
      startDate,
      endDate,
      status: SubscriptionStatus.PAYMENT_PENDING,
      upiOrderId,
      amount: plan.price,
      isPendingPayment: true,
      parentSubscriptionId: existingSubscription._id
    });
    
    await stackedSubscription.save();
    
    // Update user's pending payment status
    await User.findByIdAndUpdate(userId, {
      isPendingPayment: true
    });
    
    return res.status(200).json({
      success: true,
      message: 'Pending stacked plan subscription created',
      data: {
        subscriptionId: stackedSubscription._id,
        plan: plan.name,
        planType: plan.type,
        accountType: plan.accountType,
        status: stackedSubscription.status,
        startDate: stackedSubscription.startDate,
        endDate: stackedSubscription.endDate,
        amount: plan.price,
        features: plan.features,
        isStacked: true,
        parentSubscriptionId: existingSubscription._id
      }
    });
  } catch (error) {
    console.error('Error creating stacked plan subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating stacked plan subscription'
    });
  }
};

/**
 * Get all stacked plans for the current user
 */
export const getStackedPlans = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Find all stacked plans (subscriptions with parentSubscriptionId)
    const stackedPlans = await Subscription.find({
      userId,
      parentSubscriptionId: { $exists: true },
      status: SubscriptionStatus.ACTIVE
    }).populate('plan');
    
    return res.status(200).json({
      success: true,
      data: stackedPlans
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching stacked plans'
    });
  }
};

/**
 * Get total subscription benefits across all stacked plans
 */
export const getTotalSubscriptionBenefits = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Find all active subscriptions including stacked plans
    const allSubscriptions = await Subscription.find({
      userId,
      status: SubscriptionStatus.ACTIVE
    }).populate('plan');
    
    // Calculate total benefits
    const totalBenefits = {
      totalAmount: allSubscriptions.reduce((sum, sub) => sum + sub.amount, 0),
      totalDays: allSubscriptions.reduce((sum, sub) => {
        const days = Math.ceil((sub.endDate.getTime() - sub.startDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0),
      plans: allSubscriptions.map(sub => ({
        planId: sub.plan._id,
        planName: sub.plan.name,
        amount: sub.amount,
        startDate: sub.startDate,
        endDate: sub.endDate,
        isStacked: !!sub.parentSubscriptionId
      }))
    };
    
    return res.status(200).json({
      success: true,
      data: totalBenefits
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error calculating total subscription benefits'
    });
  }
};

// Calculate prorated amount for plan changes
const calculateProratedAmount = (
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan,
  currentAmount: number,
  newAmount: number,
  daysRemaining: number,
  totalDays: number
): number => {
  // Calculate unused amount from current plan
  const unusedAmount = (currentAmount / totalDays) * daysRemaining;
  
  // Calculate new plan's prorated amount
  const newPlanProratedAmount = (newAmount / totalDays) * daysRemaining;
  
  // For upgrades, user pays the difference
  // For downgrades, we credit the difference
  return newPlanProratedAmount - unusedAmount;
};

// Calculate total days in subscription period
const getTotalDaysInPeriod = (plan: SubscriptionPlan): number => {
  switch(plan) {
    case SubscriptionPlan.MONTHLY:
      return 30;
    case SubscriptionPlan.QUARTERLY:
      return 90;
    case SubscriptionPlan.HALF_YEARLY:
      return 180;
    case SubscriptionPlan.YEARLY:
      return 365;
    default:
      return 30;
  }
};

// Request plan change (upgrade/downgrade)
export const requestPlanChange = async (req: Request, res: Response) => {
  try {
    const { newPlan } = req.body;
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;

    // Validate new plan
    if (!Object.values(SubscriptionPlan).includes(newPlan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    // Get user's current subscription
    const currentSubscription = await Subscription.findOne({
      userId,
      status: SubscriptionStatus.ACTIVE
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Get pricing plan details
    const user = await User.findById(userId);
    const accountType = user?.isOrganization ? AccountType.ORGANIZATION : AccountType.INDIVIDUAL;
    const newPricingPlan = await PricingPlan.findOne({
      plan: newPlan,
      accountType,
      isActive: true
    });

    if (!newPricingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    // Determine if this is an upgrade or downgrade
    const isUpgrade = newPricingPlan.price > currentSubscription.amount;
    const changeType = isUpgrade ? 'upgrade' : 'downgrade';

    // Calculate days remaining in current subscription
    const now = new Date();
    const daysRemaining = Math.ceil((currentSubscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = getTotalDaysInPeriod(currentSubscription.plan);

    // Calculate prorated amount
    const proratedAmount = calculateProratedAmount(
      currentSubscription.plan,
      newPlan,
      currentSubscription.amount,
      newPricingPlan.price,
      daysRemaining,
      totalDays
    );

    // Create new subscription record for the plan change
    const newSubscription = new Subscription({
      userId,
      plan: newPlan,
      status: isUpgrade ? SubscriptionStatus.UPGRADE_PENDING : SubscriptionStatus.DOWNGRADE_PENDING,
      startDate: now,
      endDate: currentSubscription.endDate, // Keep the same end date
      amount: Math.abs(proratedAmount), // Store absolute value
      previousPlan: currentSubscription.plan,
      previousAmount: currentSubscription.amount,
      proratedAmount,
      changeType,
      effectiveDate: now,
      isPendingPayment: isUpgrade, // Only require payment for upgrades
      parentSubscriptionId: currentSubscription._id
    });

    await newSubscription.save();

    return res.status(200).json({
      success: true,
      message: isUpgrade ? 'Upgrade request created' : 'Downgrade request processed',
      data: {
        subscription: newSubscription,
        requiresPayment: isUpgrade,
        proratedAmount: Math.abs(proratedAmount),
        effectiveDate: now
      }
    });
  } catch (error) {
    console.error('Error in requestPlanChange:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing plan change request'
    });
  }
};

// Verify plan change payment
export const verifyPlanChangePayment = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, upiTransactionRef, paymentScreenshotUrl } = req.body;
    // @ts-ignore - User ID is added by auth middleware
    const userId = req.user._id;

    // Find the pending subscription change
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
      status: SubscriptionStatus.UPGRADE_PENDING
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Pending upgrade not found'
      });
    }

    // Update subscription with payment details
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.upiTransactionRef = upiTransactionRef;
    subscription.paymentScreenshotUrl = paymentScreenshotUrl;
    subscription.verificationDate = new Date();
    subscription.isPendingPayment = false;

    // Update the parent subscription
    const parentSubscription = await Subscription.findById(subscription.parentSubscriptionId);
    if (parentSubscription) {
      parentSubscription.status = SubscriptionStatus.INACTIVE;
      await parentSubscription.save();
    }

    // Update user's current plan
    await User.findByIdAndUpdate(userId, {
      currentPlan: subscription.plan,
      subscriptionStartDate: subscription.startDate,
      subscriptionEndDate: subscription.endDate
    });

    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Plan upgrade completed successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error in verifyPlanChangePayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying plan change payment'
    });
  }
};

// Process downgrade request (admin only)
export const processDowngradeRequest = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    // @ts-ignore - Admin ID is added by auth middleware
    const adminId = req.user._id;

    // Find the pending downgrade
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      status: SubscriptionStatus.DOWNGRADE_PENDING
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Pending downgrade not found'
      });
    }

    // Update subscription status
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.verifiedBy = adminId;
    subscription.verificationDate = new Date();

    // Update the parent subscription
    const parentSubscription = await Subscription.findById(subscription.parentSubscriptionId);
    if (parentSubscription) {
      parentSubscription.status = SubscriptionStatus.INACTIVE;
      await parentSubscription.save();
    }

    // Update user's current plan
    await User.findByIdAndUpdate(subscription.userId, {
      currentPlan: subscription.plan,
      subscriptionStartDate: subscription.startDate,
      subscriptionEndDate: subscription.endDate
    });

    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Plan downgrade processed successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error in processDowngradeRequest:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing downgrade request'
    });
  }
};

// Export all controller methods
export default {
  getPricingPlans,
  getUserPricingPlans,
  getLandingPagePlans,
  createPendingSubscription,
  verifyUpiPayment,
  getUserSubscription,
  getPaymentStatus,
  getPendingPayments,
  verifyPayment,
  getUserPaymentHistory,
  getAdditionalPlans,
  pauseSubscription,
  enableSubscription,
  cancelSubscription,
  stackNewPlan,
  getStackedPlans,
  getTotalSubscriptionBenefits,
  requestPlanChange,
  verifyPlanChangePayment,
  processDowngradeRequest
}; 