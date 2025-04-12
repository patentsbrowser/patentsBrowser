import express from 'express';
// import subscriptionController from '../controllers/subscriptionController';
import subscriptionController from '../controllers/subscriptionController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get pricing plans (public)
router.get('/plans', subscriptionController.getPricingPlans);

// Create pending subscription (requires auth)
router.post('/create-pending', auth, subscriptionController.createPendingSubscription);

// Verify UPI payment (requires auth)
router.post('/verify-payment', auth, subscriptionController.verifyUpiPayment);

// Get user's current subscription (requires auth)
router.get('/user-subscription', auth, subscriptionController.getUserSubscription);

export default router; 