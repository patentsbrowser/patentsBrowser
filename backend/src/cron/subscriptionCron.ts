import cron from 'node-cron';
import { updateSubscriptionStatuses } from '../services/subscriptionService.js';
// import { updateSubscriptionStatuses } from '../services/subscriptionService';

// Run every hour
export const startSubscriptionCron = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running subscription status update cron job...');
    const result = await updateSubscriptionStatuses();
    console.log('Subscription status update result:', result);
  });
}; 