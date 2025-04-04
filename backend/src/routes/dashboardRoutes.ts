import express from 'express';
// import { getPlatformStats, getDailyStats, getMonthlyStats, updatePlatformStats } from '../controllers/dashboardController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Dashboard statistics routes
// router.get('/platform-stats', auth, getPlatformStats as express.RequestHandler);
// router.get('/daily-stats', auth, getDailyStats as express.RequestHandler);
// router.get('/monthly-stats', auth, getMonthlyStats as express.RequestHandler);
// router.post('/update-stats', auth, updatePlatformStats as express.RequestHandler);

export default router; 