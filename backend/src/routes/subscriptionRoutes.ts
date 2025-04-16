import express from 'express';
// import subscriptionController from '../controllers/subscriptionController';
import subscriptionController from '../controllers/subscriptionController.js';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Get pricing plans (public)
router.get('/plans', subscriptionController.getPricingPlans);

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
router.put('/payment-verification/:paymentId', auth, adminAuth, subscriptionController.updatePaymentVerification);

// Get additional plans for a subscription (requires auth)
router.get('/additional-plans/:subscriptionId', auth, subscriptionController.getAdditionalPlans);

export default router; 