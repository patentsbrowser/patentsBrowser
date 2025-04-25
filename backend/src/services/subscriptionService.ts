import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionStatus } from '../models/Subscription.js';

export const updateSubscriptionStatuses = async () => {
  try {
    const now = new Date();

    // Update expired trials
    await User.updateMany(
      {
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndDate: { $lt: now }
      },
      {
        $set: { subscriptionStatus: SubscriptionStatus.INACTIVE }
      }
    );

    // Update expired paid subscriptions
    const expiredSubscriptions = await Subscription.find({
      status: SubscriptionStatus.ACTIVE,
      endDate: { $lt: now }
    });

    for (const subscription of expiredSubscriptions) {
      // Update subscription status
      await Subscription.findByIdAndUpdate(
        subscription._id,
        { $set: { status: SubscriptionStatus.INACTIVE } }
      );

      // Update user status
      await User.findByIdAndUpdate(
        subscription.userId,
        { $set: { subscriptionStatus: SubscriptionStatus.INACTIVE } }
      );
    }

    return {
      success: true,
      message: 'Subscription statuses updated successfully'
    };
  } catch (error) {
    console.error('Error updating subscription statuses:', error);
    return {
      success: false,
      message: 'Failed to update subscription statuses'
    };
  }
}; 