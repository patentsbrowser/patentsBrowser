import { Request, Response } from 'express';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionStatus } from '../models/Subscription.js';

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}, {
      password: 0,
      activeToken: 0,
      __v: 0
    });

    // Format user data for response
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      referenceNumber: user.referenceNumber || 'N/A',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isEmailVerified: user.isEmailVerified,
      isAdmin: user.isAdmin,
      address: user.address,
      number: user.number,
      phoneCode: user.phoneCode,
      gender: user.gender,
      nationality: user.nationality,
      trialEndDate: user.trialEndDate
    }));

    res.status(200).json({
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: {
        users: formattedUsers,
        total: formattedUsers.length
      }
    });
  } catch (error: any) {
    console.error('Error retrieving users:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve users',
      data: null
    });
  }
};

// Get user by ID with all details including subscription info
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid user ID',
        data: null
      });
    }

    // Get user information
    const user = await User.findById(userId, {
      password: 0,
      activeToken: 0,
      __v: 0
    });

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Get subscription information
    const subscription = await Subscription.findOne({ userId: user._id });

    // Format user data for response
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      referenceNumber: user.referenceNumber || 'N/A',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isEmailVerified: user.isEmailVerified,
      isAdmin: user.isAdmin,
      address: user.address,
      number: user.number,
      phoneCode: user.phoneCode,
      gender: user.gender,
      nationality: user.nationality,
      trialEndDate: user.trialEndDate,
      subscription: subscription ? {
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        cancelledAt: subscription.cancelledAt
      } : null
    };

    res.status(200).json({
      statusCode: 200,
      message: 'User retrieved successfully',
      data: userData
    });
  } catch (error: any) {
    console.error('Error retrieving user:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve user',
      data: null
    });
  }
};

// Update user details
export const updateUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;
    
    // Don't allow password updates through this route
    if (updateData.password) {
      delete updateData.password;
    }

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid user ID',
        data: null
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Format user data for response
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      isEmailVerified: user.isEmailVerified,
      isAdmin: user.isAdmin
    };

    res.status(200).json({
      statusCode: 200,
      message: 'User updated successfully',
      data: userData
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to update user',
      data: null
    });
  }
};

// Delete a user
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid user ID',
        data: null
      });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Also delete any subscriptions associated with this user
    await Subscription.deleteMany({ userId });

    res.status(200).json({
      statusCode: 200,
      message: 'User deleted successfully',
      data: null
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to delete user',
      data: null
    });
  }
};

// Get subscription statistics
export const getSubscriptionStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubscriptions = await User.countDocuments({
      $or: [
        { subscriptionStatus: 'active' },
        { subscriptionStatus: 'paid' }
      ]
    });
    const trialUsers = await User.countDocuments({ subscriptionStatus: 'trial' });
    const expiredSubscriptions = await User.countDocuments({ subscriptionStatus: 'inactive' });

    const stats = {
      totalUsers,
      activeSubscriptions,
      trialUsers,
      expiredSubscriptions,
      conversionRate: totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0
    };

    res.status(200).json({
      statusCode: 200,
      message: 'Subscription statistics retrieved successfully',
      data: stats
    });
  } catch (error: any) {
    console.error('Error retrieving subscription statistics:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve subscription statistics',
      data: null
    });
  }
};

// Make a user an admin
export const makeUserAdmin = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid user ID',
        data: null
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isAdmin: true } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: 'User promoted to admin successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error: any) {
    console.error('Error making user admin:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to make user admin',
      data: null
    });
  }
};

// Remove admin status from a user
export const removeAdminStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid user ID',
        data: null
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isAdmin: false } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: 'Admin status removed successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error: any) {
    console.error('Error removing admin status:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to remove admin status',
      data: null
    });
  }
};

// Manage user subscription as admin
export const manageUserSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { plan, startDate, endDate, status } = req.body;

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid user ID',
        data: null
      });
    }

    // Validate required fields
    if (!startDate || !endDate || !status) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required fields: startDate, endDate, and status are required',
        data: null
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Find existing active subscriptions
    const existingSubscriptions = await Subscription.find({ 
      userId,
      status: SubscriptionStatus.ACTIVE 
    }).sort({ endDate: -1 });

    // Create new subscription
    const newSubscription = new Subscription({
      userId,
      plan: plan || 'paid',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status
    });

    // If there are existing active subscriptions, mark this as an additional plan
    if (existingSubscriptions.length > 0) {
      newSubscription.parentSubscriptionId = existingSubscriptions[0]._id;
    }

    await newSubscription.save();

    // Update user's subscription status
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: status,
      updatedAt: new Date()
    });

    // Get all active subscriptions after update
    const updatedSubscriptions = await Subscription.find({
      userId,
      status: SubscriptionStatus.ACTIVE
    }).sort({ endDate: -1 });

    // Determine if this is a custom plan
    const isCustomPlan = updatedSubscriptions.length > 1;

    res.status(200).json({
      statusCode: 200,
      message: 'Subscription updated successfully',
      data: {
        subscription: {
          userId,
          plan: isCustomPlan ? 'custom' : newSubscription.plan,
          startDate: newSubscription.startDate,
          endDate: newSubscription.endDate,
          status: newSubscription.status
        },
        additionalPlans: updatedSubscriptions.slice(1).map(sub => ({
          plan: sub.plan,
          startDate: sub.startDate,
          endDate: sub.endDate,
          status: sub.status
        }))
      }
    });
  } catch (error: any) {
    console.error('Error managing user subscription:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to update subscription: ' + error.message,
      data: null
    });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found'
      });
    }

    // Find all active subscriptions for the user
    const subscriptions = await Subscription.find({
      userId,
      status: SubscriptionStatus.ACTIVE
    }).sort({ endDate: -1 }); // Sort by endDate to get the latest subscription first

    // Get the main subscription (the one with the latest end date)
    const mainSubscription = subscriptions[0];

    // Get additional plans (all other active subscriptions)
    const additionalPlans = subscriptions.slice(1);

    // Determine if this is a custom plan (multiple active subscriptions)
    const isCustomPlan = subscriptions.length > 1;

    // Transform the user data
    const userProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      number: user.number,
      phoneCode: user.phoneCode,
      imageUrl: user.imageUrl,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      address: user.address,
      gender: user.gender,
      nationality: user.nationality,
      isAdmin: user.isAdmin,
      isEmailVerified: user.isEmailVerified,
      timeSpent: user.timeSpent,
      loginCount: user.loginCount,
      avgSessionDuration: user.avgSessionDuration,
      lastSessionDuration: user.lastSessionDuration,
      subscription: mainSubscription ? {
        plan: isCustomPlan ? 'custom' : mainSubscription.plan,
        startDate: mainSubscription.startDate,
        endDate: mainSubscription.endDate,
        status: mainSubscription.status,
        _id: mainSubscription._id
      } : undefined,
      additionalPlans: additionalPlans.length > 0 ? additionalPlans.map(plan => ({
        plan: plan.plan,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: plan.status,
        _id: plan._id
      })) : undefined
    };

    return res.status(200).json({
      statusCode: 200,
      data: userProfile
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to get user profile'
    });
  }
}; 