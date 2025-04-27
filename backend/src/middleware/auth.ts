import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

// Declare module to extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: mongoose.Types.ObjectId;
        userId: string;
        email: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: 'No token provided',
        data: null,
        code: 'INVALID_TOKEN'
      });
    }

    // Verify token signature
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      // Check if user exists and if the token matches the active token
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          statusCode: 401,
          message: 'User not found',
          data: null,
          code: 'INVALID_TOKEN'
        });
      }
      
      // TEMPORARY FIX: Skip token matching check
      // This should be re-enabled once token handling is fixed
      /*
      if (user.activeToken !== token) {
        return res.status(401).json({ 
          statusCode: 401,
          message: 'Session expired. Please login again.',
          data: null,
          code: 'SESSION_EXPIRED'
        });
      }
      */
      
      // Set user data on the request
      req.user = {
        _id: user._id,  // Ensure we're setting the MongoDB ID object directly
        userId: decoded.userId,
        email: user.email
      };
      
      next();
    } catch (jwtError: any) {
      return res.status(401).json({ 
        statusCode: 401,
        message: 'Invalid token',
        data: null,
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        statusCode: 401,
        message: 'Please authenticate',
        data: null,
        code: 'INVALID_TOKEN'
      });
    }
    
    res.status(401).json({ 
      statusCode: 401,
      message: error.message || 'Please authenticate',
      data: null,
      code: 'AUTH_ERROR'
    });
  }
}; 