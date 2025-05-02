import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Middleware to check if the authenticated user has admin privileges
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required',
        data: null
      });
    }

    // Fetch the user to check if they have admin privileges
    const User = mongoose.model('User');
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }
    
    // Check if user is an admin
    if (!user.isAdmin) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Admin access required',
        data: null
      });
    }
    
    // User is authenticated and has admin privileges, proceed
    next();
  } catch (error: any) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      data: null
    });
  }
}; 