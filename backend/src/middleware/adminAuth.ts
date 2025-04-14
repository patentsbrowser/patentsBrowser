import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required',
        data: null
      });
    }

    // Fetch the user to check if they have admin privileges
    const user = await User.findById(req.user.userId);
    
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
    console.error('Admin auth middleware error:', error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      data: null
    });
  }
}; 