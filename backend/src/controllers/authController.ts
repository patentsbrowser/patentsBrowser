import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import path from 'path';
import { generateOTP, sendOTP, storeOTP } from '../services/otpService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        statusCode: 409,
        message: 'Email already exists',
        data: null
      });
    }

    const user = new User({ email, password, name });
    await user.save();
    
    // Generate and send OTP
    const otp = generateOTP();
    await sendOTP(email, otp);
    storeOTP(email, otp);

    res.status(201).json({
      statusCode: 201,
      message: 'Account created! Please verify your email.',
      data: {
        user: { id: user._id, email, name }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Registration failed. Please try again.',
      data: null
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);
    
    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(404).json({
        statusCode: 404,
        message: 'Email not found',
        data: null
      });
    }

    const isValidPassword = await user.comparePassword(password);
    console.log('Password validation:', isValidPassword ? 'Valid' : 'Invalid');
    
    if (!isValidPassword) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid password',
        data: null
      });
    }

    // Check if email is verified
    console.log('Email verification status:', user.isEmailVerified ? 'Verified' : 'Not verified');
    
    if (!user.isEmailVerified) {
      console.log('Generating and sending OTP for unverified email');
      const otp = generateOTP();
      await sendOTP(email, otp);
      storeOTP(email, otp);

      return res.status(200).json({
        statusCode: 200,
        message: 'Please verify your email with OTP',
        data: null
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.status(200).json({
      statusCode: 200,
      message: 'Successfully logged in!',
      data: {
        token,
        user: { id: user._id, email: user.email, name: user.name }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Login failed. Please try again.',
      data: null
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    // Add type guard to check if req.user exists
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        data: null
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: 'Profile fetched successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,    
      message: 'Failed to fetch profile',
      data: null
    });
  }
};      

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, email, number, phoneCode, address, imageUrl, gender, nationality } = req.body;
    
    // Add type guard to check if req.user exists
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        data: null
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    user.name = name;
    user.email = email;
    user.number = number;
    if (phoneCode) {
      user.phoneCode = phoneCode;
    }
    user.address = address; 
    user.imageUrl = imageUrl;
    user.gender = gender;
    user.nationality = nationality;

    await user.save();

    res.status(200).json({
      statusCode: 200,  
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,  
      message: 'Failed to update profile',
      data: null
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Please authenticate',
        data: null
      });
    }

    // You might want to handle token invalidation here
    // For example, if you're using a token blacklist or session store

    res.status(200).json({
      statusCode: 200,
      message: 'Successfully logged out',
      data: null
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to logout. Please try again.',
      data: null
    });
  }
};

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        data: null
      });
    }

    if (!req.file) {
      return res.status(400).json({
        statusCode: 400,
        message: 'No file uploaded',
        data: null
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Generate the URL for the uploaded file
    const fileUrl = `/uploadedImages/${req.file.filename}`;
    
    // Update user with new image URL
    user.imageUrl = fileUrl;
    await user.save();

    res.status(200).json({
      statusCode: 200,
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl: fileUrl
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to upload image',
      data: null
    });
  }
}; 