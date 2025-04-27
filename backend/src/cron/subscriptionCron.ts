import cron from 'node-cron';
import { updateSubscriptionStatuses } from '../services/subscriptionService.js';
// import { updateSubscriptionStatuses } from '../services/subscriptionService';

// Run every hour
export const startSubscriptionCron = () => {
  cron.schedule('0 * * * *', async () => {
    const result = await updateSubscriptionStatuses();
  });
}; 