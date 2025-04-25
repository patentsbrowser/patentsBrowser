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
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Auth middleware - token received:', token ? `${token.substring(0, 10)}...` : 'No token');
    
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
      console.log('Auth middleware - decoded token:', { ...decoded, userId: decoded.userId });
      
      // Check if user exists and if the token matches the active token
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        console.log('User not found for ID:', decoded.userId);
        return res.status(401).json({
          statusCode: 401,
          message: 'User not found',
          data: null,
          code: 'INVALID_TOKEN'
        });
      }
      
      // Check for user inactivity
      const lastActivity = user.lastActivity || user.lastLogin;
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        console.log('User inactive for too long, logging out');
        // Clear the active token
        user.activeToken = null;
        await user.save();
        
        return res.status(401).json({
          statusCode: 401,
          message: 'Session expired due to inactivity',
          data: null,
          code: 'SESSION_EXPIRED'
        });
      }
      
      // Update last activity timestamp
      user.lastActivity = now;
      await user.save();
      
      // Set user data on the request
      req.user = {
        _id: user._id,
        userId: decoded.userId,
        email: user.email
      };
      
      console.log('Auth middleware - user set on request:', req.user);
      next();
    } catch (jwtError: any) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({ 
        statusCode: 401,
        message: 'Invalid token',
        data: null,
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);
    
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