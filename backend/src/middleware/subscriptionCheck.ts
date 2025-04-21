import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';

import Subscription, { SubscriptionStatus } from '../models/Subscription.js';

export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user ID from request (set by auth middleware)
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Get user and their subscription
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Check subscription status
    switch(user.subscriptionStatus) {
      case SubscriptionStatus.TRIAL:
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const trialEndDate = new Date(user.trialEndDate);
        trialEndDate.setHours(0, 0, 0, 0);
        
        if (trialEndDate < today) {
          // Trial has expired
          return res.status(403).json({
            statusCode: 403,
            message: 'Trial period has expired. Please subscribe to continue using premium features.',
            data: {
              isSubscriptionActive: false,
              subscriptionStatus: SubscriptionStatus.INACTIVE,
              endDate: user.trialEndDate
            }
          });
        }
        break;

      case SubscriptionStatus.INACTIVE:
        return res.status(403).json({
          statusCode: 403,
          message: 'Your subscription is inactive. Please contact support to reactivate.',
          data: {
            isSubscriptionActive: false,
            subscriptionStatus: SubscriptionStatus.INACTIVE
          }
        });

      case SubscriptionStatus.CANCELLED:
        return res.status(403).json({
          statusCode: 403,
          message: 'Your subscription has been cancelled. Please subscribe again to continue using premium features.',
          data: {
            isSubscriptionActive: false,
            subscriptionStatus: SubscriptionStatus.CANCELLED
          }
        });

      case SubscriptionStatus.REJECTED:
        return res.status(403).json({
          statusCode: 403,
          message: 'Your payment was rejected. Please try again or contact support.',
          data: {
            isSubscriptionActive: false,
            subscriptionStatus: SubscriptionStatus.REJECTED
          }
        });

      case SubscriptionStatus.PAYMENT_PENDING:
        // Allow access while payment is pending
        break;

      case SubscriptionStatus.ACTIVE:
      case SubscriptionStatus.PAID:
        // Check if subscription is still valid
        const subscription = await Subscription.findOne({
          userId,
          status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAID] },
          endDate: { $gt: new Date() }
        }).sort({ endDate: -1 });

        if (!subscription) {
          return res.status(403).json({
            statusCode: 403,
            message: 'Your subscription has expired. Please renew to continue using premium features.',
            data: {
              isSubscriptionActive: false,
              subscriptionStatus: SubscriptionStatus.INACTIVE
            }
          });
        }
        break;

      default:
        return res.status(403).json({
          statusCode: 403,
          message: 'Invalid subscription status. Please contact support.',
          data: {
            isSubscriptionActive: false,
            subscriptionStatus: user.subscriptionStatus
          }
        });
    }

    // If we get here, the subscription is valid
    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Error checking subscription status',
      data: null
    });
  }
}; 