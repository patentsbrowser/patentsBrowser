import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createOrganization,
  generateInviteLink,
  joinOrganization,
  getOrganizationDetails,
  removeMember,
  updateOrganizationSubscription
} from '../controllers/organizationController.js';

const router = express.Router();

// Create new organization
router.post('/create', authenticateToken, createOrganization);

// Generate invite link
router.post('/invite', authenticateToken, generateInviteLink);

// Join organization using invite link
router.post('/join/:token', authenticateToken, joinOrganization);

// Get organization details
router.get('/details', authenticateToken, getOrganizationDetails);

// Remove member from organization
router.delete('/members/:memberId', authenticateToken, removeMember);

// Update organization subscription
router.put('/subscription', authenticateToken, updateOrganizationSubscription);

export default router; 