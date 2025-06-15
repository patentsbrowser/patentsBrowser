import cron from 'node-cron';
import { User } from '../models/User.js';
// import { SubscriptionStatus } from '../types/subscription.js';
// import { sendTrialExpiryWarning, sendTrialExpiredEmail, sendTrialFinalReminder } from './trialEmailService.js';
import { SubscriptionStatus } from '../models/Subscription.js';
import { sendTrialExpiredEmail, sendTrialExpiryWarning, sendTrialFinalReminder } from './trialEmailService.js';

// Track which users have been notified to avoid duplicate emails
const notificationTracker = {
  threeDayWarning: new Set<string>(),
  oneDayWarning: new Set<string>(),
  expired: new Set<string>()
};

// Reset notification tracker daily
const resetNotificationTracker = () => {
  const now = new Date();

  // Clear trackers at midnight
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    notificationTracker.threeDayWarning.clear();
    notificationTracker.oneDayWarning.clear();
    notificationTracker.expired.clear();
    console.log('🔄 Notification tracker reset for new day');
  }
};

// Check and send trial expiry notifications
export const checkTrialExpirations = async () => {
  try {
    console.log('🔍 Checking trial expirations...');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate dates for notifications
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Find users on trial
    const trialUsers = await User.find({
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndDate: { $exists: true, $ne: null }
    }).select('email name trialEndDate trialStartDate');

    console.log(`📊 Found ${trialUsers.length} users on trial`);

    for (const user of trialUsers) {
      const userEmail = user.email;
      const userName = user.name || 'User';
      const trialEndDate = new Date(user.trialEndDate);
      trialEndDate.setHours(23, 59, 59, 999); // End of day
      
      // Calculate days remaining
      const timeDiff = trialEndDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      console.log(`👤 User ${userEmail}: ${daysRemaining} days remaining`);

      try {
        // Send 3-day warning
        if (daysRemaining === 3 && !notificationTracker.threeDayWarning.has(userEmail)) {
          console.log(`📧 Sending 3-day warning to ${userEmail}`);
          const sent = await sendTrialExpiryWarning(userEmail, userName, 3);
          if (sent) {
            notificationTracker.threeDayWarning.add(userEmail);
            console.log(`✅ 3-day warning sent to ${userEmail}`);
          }
        }
        
        // Send 1-day final reminder
        else if (daysRemaining === 1 && !notificationTracker.oneDayWarning.has(userEmail)) {
          console.log(`📧 Sending final reminder to ${userEmail}`);
          const sent = await sendTrialFinalReminder(userEmail, userName);
          if (sent) {
            notificationTracker.oneDayWarning.add(userEmail);
            console.log(`✅ Final reminder sent to ${userEmail}`);
          }
        }
        
        // Send expiry notification and update status
        else if (daysRemaining <= 0 && !notificationTracker.expired.has(userEmail)) {
          console.log(`📧 Sending expiry notification to ${userEmail}`);
          const sent = await sendTrialExpiredEmail(userEmail, userName);
          if (sent) {
            notificationTracker.expired.add(userEmail);
            console.log(`✅ Expiry notification sent to ${userEmail}`);
          }
          
          // Update user subscription status to inactive
          await User.findByIdAndUpdate(user._id, {
            subscriptionStatus: SubscriptionStatus.INACTIVE
          });
          console.log(`🔄 Updated ${userEmail} status to inactive`);
        }
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${userEmail}:`, emailError);
      }
    }
    
    console.log('✅ Trial expiration check completed');
  } catch (error) {
    console.error('❌ Error checking trial expirations:', error);
  }
};

// Initialize trial scheduler
export const initializeTrialScheduler = () => {
  console.log('🚀 Initializing trial scheduler...');
  
  // Run every hour to check for trial expirations
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running hourly trial expiration check...');
    await checkTrialExpirations();
    resetNotificationTracker();
  });
  
  // Run at startup to catch any missed notifications
  setTimeout(async () => {
    console.log('🔄 Running initial trial expiration check...');
    await checkTrialExpirations();
  }, 5000); // Wait 5 seconds after startup
  
  console.log('✅ Trial scheduler initialized successfully');
  console.log('📅 Schedule: Every hour on the hour');
};

// Manual trigger for testing
export const triggerTrialCheck = async () => {
  console.log('🧪 Manual trial check triggered');
  await checkTrialExpirations();
};

// Get trial statistics
export const getTrialStatistics = async () => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats = await User.aggregate([
      {
        $match: {
          subscriptionStatus: SubscriptionStatus.TRIAL,
          trialEndDate: { $exists: true, $ne: null }
        }
      },
      {
        $addFields: {
          daysRemaining: {
            $ceil: {
              $divide: [
                { $subtract: ['$trialEndDate', today] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTrialUsers: { $sum: 1 },
          expiringSoon: {
            $sum: {
              $cond: [{ $lte: ['$daysRemaining', 3] }, 1, 0]
            }
          },
          expiringToday: {
            $sum: {
              $cond: [{ $lte: ['$daysRemaining', 0] }, 1, 0]
            }
          },
          averageDaysRemaining: { $avg: '$daysRemaining' }
        }
      }
    ]);
    
    return stats[0] || {
      totalTrialUsers: 0,
      expiringSoon: 0,
      expiringToday: 0,
      averageDaysRemaining: 0
    };
  } catch (error) {
    console.error('Error getting trial statistics:', error);
    return {
      totalTrialUsers: 0,
      expiringSoon: 0,
      expiringToday: 0,
      averageDaysRemaining: 0
    };
  }
};

export default {
  initializeTrialScheduler,
  checkTrialExpirations,
  triggerTrialCheck,
  getTrialStatistics
};
