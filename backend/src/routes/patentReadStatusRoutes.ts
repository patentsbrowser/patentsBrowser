import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  markPatentAsRead,
  getReadPatents,
  checkPatentsReadStatus
} from '../controllers/patentReadStatusController.js';

const router = express.Router();

// Mark a patent as read
router.post('/mark-read', auth, markPatentAsRead as any);

// Get all read patents for a user
router.get('/list', auth, getReadPatents as any);

// Check read status for multiple patents
router.post('/check-status', auth, checkPatentsReadStatus as any);

export default router; 