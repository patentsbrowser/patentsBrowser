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

    // Get all active subscriptions
    const subscriptions = await Subscription.find({
      status: SubscriptionStatus.ACTIVE
    });

    // Create a map of user IDs to their subscription status
    const subscriptionMap = new Map();
    subscriptions.forEach(sub => {
      subscriptionMap.set(sub.userId.toString(), true);
    });

    // Format user data for response
    const formattedUsers = users.map(user => {
      // Only set subscriptionStatus if user has an active subscription
      const hasSubscription = subscriptionMap.get(user._id.toString());
      
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        subscriptionStatus: hasSubscription ? user.subscriptionStatus : null,
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
      };
    });

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

    // Get all active subscriptions for the user
    const subscriptions = await Subscription.find({
      userId: user._id,
      status: SubscriptionStatus.ACTIVE
    }).sort({ endDate: -1 }); // Sort by endDate to get the latest subscription first

    // Get the main subscription (the one with no parentSubscriptionId)
    const mainSubscription = subscriptions.find(sub => !sub.parentSubscriptionId) || subscriptions[0];

    // Get additional plans (all subscriptions with parentSubscriptionId)
    const additionalPlans = subscriptions.filter(sub => sub.parentSubscriptionId);

    // Calculate total subscription duration and latest end date
    let latestEndDate = mainSubscription ? new Date(mainSubscription.endDate) : null;
    let totalDays = 0;

    if (mainSubscription) {
      const mainDays = Math.ceil(
        (new Date(mainSubscription.endDate).getTime() - new Date(mainSubscription.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      totalDays += mainDays;
    }

    // Add duration from additional plans
    additionalPlans.forEach(plan => {
      const planDays = Math.ceil(
        (new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      totalDays += planDays;

      // Update latest end date if this plan ends later
      if (latestEndDate && new Date(plan.endDate) > latestEndDate) {
        latestEndDate = new Date(plan.endDate);
      }
    });

    // Calculate remaining trial days if user is on trial
    let trialDaysRemaining = 0;
    if (user.subscriptionStatus === SubscriptionStatus.TRIAL && user.trialEndDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const trialEndDate = new Date(user.trialEndDate);
      trialEndDate.setHours(0, 0, 0, 0);
      
      if (trialEndDate > today) {
        const diffTime = trialEndDate.getTime() - today.getTime();
        trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // Calculate total amount from all subscriptions
    const totalAmount = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

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
      trialDaysRemaining,
      subscription: subscriptions.length > 0 ? {
        isActive: true,
        mainPlan: mainSubscription,
        additionalPlans,
        isCustomPlan: additionalPlans.length > 0,
        totalDays,
        totalAmount,
        latestEndDate,
        stackedPlansCount: additionalPlans.length,
        trialDaysRemaining
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

    // Get the main subscription (the one with no parentSubscriptionId)
    const mainSubscription = existingSubscriptions.find(sub => !sub.parentSubscriptionId);

    // Create new subscription
    const newSubscription = new Subscription({
      userId,
      plan: plan || 'paid',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status
    });

    // If there's a main subscription, this is a stacked plan
    if (mainSubscription) {
      newSubscription.parentSubscriptionId = mainSubscription._id;
    }

    await newSubscription.save();

    // Get all active subscriptions after update
    const updatedSubscriptions = await Subscription.find({
      userId,
      status: SubscriptionStatus.ACTIVE
    }).sort({ endDate: -1 });

    // Calculate total subscription duration and latest end date
    let latestEndDate = new Date(endDate);
    let totalDays = 0;

    updatedSubscriptions.forEach(sub => {
      const subDays = Math.ceil(
        (new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      totalDays += subDays;

      // Update latest end date if this subscription ends later
      if (new Date(sub.endDate) > latestEndDate) {
        latestEndDate = new Date(sub.endDate);
      }
    });

    // Update user's subscription status and end date
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: status,
      subscriptionEndDate: latestEndDate,
      updatedAt: new Date()
    });

    // Get additional plans (all subscriptions with parentSubscriptionId)
    const additionalPlans = updatedSubscriptions.filter(sub => sub.parentSubscriptionId);

    // Calculate total amount
    const totalAmount = updatedSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

    return res.status(200).json({
      statusCode: 200,
      message: 'Subscription updated successfully',
      data: {
        subscription: {
          isActive: true,
          mainPlan: mainSubscription || newSubscription,
          additionalPlans,
          isCustomPlan: additionalPlans.length > 0,
          totalDays,
          totalAmount,
          latestEndDate,
          stackedPlansCount: additionalPlans.length
        }
      }
    });
  } catch (error) {
    console.error('Error managing user subscription:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Error managing user subscription',
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

    // Get the main subscription (the one with no parentSubscriptionId)
    const mainSubscription = subscriptions.find(sub => !sub.parentSubscriptionId) || subscriptions[0];

    // Get additional plans (all subscriptions with parentSubscriptionId)
    const additionalPlans = subscriptions.filter(sub => sub.parentSubscriptionId);

    // Calculate total subscription duration and latest end date
    let latestEndDate = mainSubscription ? new Date(mainSubscription.endDate) : null;
    let totalDays = 0;

    if (mainSubscription) {
      const mainDays = Math.ceil(
        (new Date(mainSubscription.endDate).getTime() - new Date(mainSubscription.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      totalDays += mainDays;
    }

    // Add duration from additional plans
    additionalPlans.forEach(plan => {
      const planDays = Math.ceil(
        (new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      totalDays += planDays;

      // Update latest end date if this plan ends later
      if (latestEndDate && new Date(plan.endDate) > latestEndDate) {
        latestEndDate = new Date(plan.endDate);
      }
    });

    // Determine if this is a custom plan (has stacked plans)
    const isCustomPlan = additionalPlans.length > 0;

    // Calculate total amount
    const totalAmount = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

    return res.status(200).json({
      statusCode: 200,
      message: 'User profile retrieved successfully',
      data: {
        ...user.toObject(),
        subscription: {
          isActive: subscriptions.length > 0,
          mainPlan: mainSubscription,
          additionalPlans,
          isCustomPlan,
          totalDays,
          totalAmount,
          latestEndDate,
          stackedPlansCount: additionalPlans.length
        }
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Error getting user profile'
    });
  }
}; 