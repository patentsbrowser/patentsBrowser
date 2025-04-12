import express from 'express';
// import subscriptionController from '../controllers/subscriptionController';
import { auth as authMiddleware } from '../middleware/auth.js';
import subscriptionController from '../controllers/subscriptionController.js';

const router = express.Router();

// Get pricing plans (public)
router.get('/plans', subscriptionController.getPricingPlans);

// Protected routes (require authentication)
router.post('/order', authMiddleware, subscriptionController.createSubscriptionOrder);
router.post('/verify', authMiddleware, subscriptionController.verifyAndActivateSubscription);
router.post('/trial', authMiddleware, subscriptionController.startFreeTrial);
router.get('/user', authMiddleware, subscriptionController.getUserSubscription);
router.post('/cancel', authMiddleware, subscriptionController.cancelSubscription);

// Webhook route (no auth required, but has signature verification)
router.post('/webhook', subscriptionController.handleWebhook);

export default router; 