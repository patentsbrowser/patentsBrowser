import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Extended Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: { _id: mongoose.Types.ObjectId; userId: string; email: string; };
    }
  }
}

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Please authenticate',
        code: 'AUTH_REQUIRED',
        data: null
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          statusCode: 401,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          data: null
        });
      }

      // Check if token is the active token
      if (user.activeToken !== token) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Session expired. Please login again',
          code: 'SESSION_EXPIRED',
          data: null
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
        data: null
      });
    }
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Server error during authentication',
      data: null
    });
  }
};

// Admin authorization middleware
export const authorizeAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Admin access required',
        data: null
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Server error during authorization',
      data: null
    });
  }
};

// Optional authentication middleware - allows requests to proceed even without auth
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      // No token, but that's okay - proceed as guest
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);

      if (user && user.activeToken === token) {
        req.user = user;
      }
      // Even if user lookup failed, proceed anyway
      next();
    } catch (error) {
      // Invalid token, but that's okay for optional auth - proceed as guest
      next();
    }
  } catch (error) {
    // Server error during auth process
    res.status(500).json({
      statusCode: 500,
      message: 'Server error during authentication',
      data: null
    });
  }
}; 