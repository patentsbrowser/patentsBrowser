import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

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
    
    // Check if this token is the active token for this user
    if (user.activeToken !== token) {
      return res.status(401).json({ 
        statusCode: 401,
        message: 'Session expired. Please login again.',
        data: null,
        code: 'SESSION_EXPIRED'
      });
    }
    
    req.user = decoded;
    next();
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