import express from 'express';
// import subscriptionController from '../controllers/subscriptionController';
import subscriptionController from '../controllers/subscriptionController.js';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { checkSubscription } from '../middleware/subscriptionCheck.js';

const router = express.Router();

// Get pricing plans (public) - can filter by account type
router.get('/plans', subscriptionController.getPricingPlans);

// Get landing page plans (public) - shows both individual and organization plans
router.get('/landing-plans', subscriptionController.getLandingPagePlans);

// Get pricing plans for authenticated user (based on their account type)
router.get('/user-plans', auth, subscriptionController.getUserPricingPlans);

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

// Stack new plan on existing subscription (requires auth)
router.post('/stack-plan', auth, subscriptionController.stackNewPlan);

// Get stacked plans (requires auth)
router.get('/stacked-plans', auth, subscriptionController.getStackedPlans);

// Get total subscription benefits (requires auth)
router.get('/total-benefits', auth, subscriptionController.getTotalSubscriptionBenefits);

// Admin routes
// Get all pending payments (admin only)
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

// Plan change routes
router.post('/change-plan', auth, subscriptionController.requestPlanChange);
router.post('/verify-plan-change', auth, subscriptionController.verifyPlanChangePayment);
router.post('/process-downgrade/:subscriptionId', auth, adminAuth, subscriptionController.processDowngradeRequest);

export default router; 