import express from 'express';
// import subscriptionController from '../controllers/subscriptionController';
import subscriptionController from '../controllers/subscriptionController.js';

const router = express.Router();

// Get pricing plans (public)
router.get('/plans', subscriptionController.getPricingPlans);

// Removed all protected routes

export default router; 