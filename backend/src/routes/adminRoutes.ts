import express from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  getSubscriptionStats,
  makeUserAdmin,
  removeAdminStatus,
  manageUserSubscription
} from '../controllers/adminController.js';

const router = express.Router();

// Apply authentication and admin authorization middleware to all routes
router.use(auth);
router.use(adminAuth);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUserById);
router.delete('/users/:id', deleteUserById);

// Subscription management routes
router.get('/subscription-stats', getSubscriptionStats);
router.post('/users/:id/subscription', manageUserSubscription);

// Admin management routes
router.put('/users/:id/make-admin', makeUserAdmin);
router.put('/users/:id/remove-admin', removeAdminStatus);

export default router; 