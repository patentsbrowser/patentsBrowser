import express from 'express';
import { triggerTrialCheck, getTrialStatistics } from '../services/trialScheduler.js';
import { User } from '../models/User.js';
import { SubscriptionStatus } from '../models/Subscription.js';
// import { SubscriptionStatus } from 'src/models/Subscription.js';
// import { SubscriptionStatus } from '../types/subscription.js';

const router = express.Router();

// Manual trigger for trial check (for testing)
router.post('/trigger-check', async (req, res) => {
  try {
    console.log('Manual trial check triggered via API');
    await triggerTrialCheck();
    res.status(200).json({
      success: true,
      message: 'Trial check triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering trial check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger trial check',
      error: error.message
    });
  }
});

// Get trial statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getTrialStatistics();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting trial statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trial statistics',
      error: error.message
    });
  }
});

// Get all users on trial (for admin)
router.get('/users', async (req, res) => {
  try {
    const trialUsers = await User.find({
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndDate: { $exists: true, $ne: null }
    }).select('email name trialStartDate trialEndDate userType').sort({ trialEndDate: 1 });

    const now = new Date();
    const usersWithDaysRemaining = trialUsers.map(user => {
      const trialEndDate = new Date(user.trialEndDate);
      const timeDiff = trialEndDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      return {
        ...user.toObject(),
        daysRemaining,
        status: daysRemaining <= 0 ? 'expired' : daysRemaining <= 3 ? 'expiring_soon' : 'active'
      };
    });

    res.status(200).json({
      success: true,
      data: usersWithDaysRemaining,
      total: usersWithDaysRemaining.length
    });
  } catch (error) {
    console.error('Error getting trial users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trial users',
      error: error.message
    });
  }
});

// Extend trial for a user (for admin)
router.post('/extend/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.body; // Default 7 days extension

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.subscriptionStatus !== SubscriptionStatus.TRIAL) {
      return res.status(400).json({
        success: false,
        message: 'User is not on trial'
      });
    }

    // Extend trial end date
    const currentEndDate = new Date(user.trialEndDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(currentEndDate.getDate() + days);

    await User.findByIdAndUpdate(userId, {
      trialEndDate: newEndDate
    });

    res.status(200).json({
      success: true,
      message: `Trial extended by ${days} days`,
      data: {
        userId,
        oldEndDate: currentEndDate,
        newEndDate,
        daysExtended: days
      }
    });
  } catch (error) {
    console.error('Error extending trial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend trial',
      error: error.message
    });
  }
});

export default router;
