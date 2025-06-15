import express from 'express';
// import subscriptionController from '../controllers/subscriptionController';
import subscriptionController from '../controllers/subscriptionController.js';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { checkSubscription } from '../middleware/subscriptionCheck.js';

const router = express.Router();

// Get pricing plans (public)
router.get('/plans', subscriptionController.getPricingPlans);

// Get pricing plans based on user type (requires auth)
router.get('/plans/user-specific', auth, subscriptionController.getUserSpecificPlans);

// Create pending subscription (requires auth)
router.post('/create-pending', auth, subscriptionController.createPendingSubscription);

// Verify UPI payment (requires auth)
router.post('/verify-payment', auth, subscriptionController.verifyUpiPayment);

// Get user's current subscription (requires auth)
router.get('/user-subscription', auth, subscriptionController.getUserSubscription);

// Check payment status by transaction ID (requires auth)
router.get('/payment-status/:transactionId', auth, subscriptionController.getPaymentStatus);

// Get user's payment history (requires auth)
router.get('/payment-history', auth, subscriptionController.getUserPaymentHistory);

// Admin routes (requires auth and admin privileges)
// Get all pending payments for admin verification
router.get('/pending-payments', auth, adminAuth, subscriptionController.getPendingPayments);

// Update payment verification status (admin only)
router.put('/payment-verification/:paymentId', auth, adminAuth, subscriptionController.verifyPayment);

// Get additional plans for a subscription (requires auth)
router.get('/additional-plans/:subscriptionId', auth, subscriptionController.getAdditionalPlans);

// Add subscription check route
router.get('/check', auth, checkSubscription, (req, res) => {
  res.status(200).json({
    statusCode: 200,
    message: 'Subscription is active',
    data: {
      isSubscriptionActive: true
    }
  });
});

// Admin subscription management routes
router.post('/users/:userId/pause-subscription', auth, adminAuth, subscriptionController.pauseSubscription);
router.post('/users/:userId/enable-subscription', auth, adminAuth, subscriptionController.enableSubscription);
router.post('/users/:userId/cancel-subscription', auth, adminAuth, subscriptionController.cancelSubscription);

// Stack a new plan on top of existing subscription (requires auth)
router.post('/stack-plan', auth, subscriptionController.stackNewPlan);

// Get all stacked plans for the current user (requires auth)
router.get('/stacked-plans', auth, subscriptionController.getStackedPlans);

// Get total subscription benefits across all stacked plans (requires auth)
router.get('/total-benefits', auth, subscriptionController.getTotalSubscriptionBenefits);

export default router; 