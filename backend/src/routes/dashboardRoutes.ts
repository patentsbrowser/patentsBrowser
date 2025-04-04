import express from 'express';
import { getPlatformStats, getDailyStats, getMonthlyStats, updatePlatformStats } from '../controllers/dashboardController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Protected routes - require authentication
router.get('/platform-stats', auth, getPlatformStats);
router.get('/daily-stats', auth, getDailyStats);
router.get('/monthly-stats', auth, getMonthlyStats);
router.post('/update-stats', auth, updatePlatformStats);

export default router; 