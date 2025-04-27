import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { generateOTP, sendOTP, storeOTP } from '../services/otpService.js';
import { googleAuthService } from '../services/googleAuthService.js';

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
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Email not found',
        data: null
      });
    }

    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid password',
        data: null
      });
    }

    // Generate a new token regardless of email verification status
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    
    // Update the user's activeToken and lastLogin
    user.activeToken = token;
    user.lastLogin = new Date();
    
    // If email is not verified, mark it as verified since we're allowing login
    // without OTP verification
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    
    await user.save();
    
    const responseData = {
      statusCode: 200,
      message: 'Successfully logged in!',
      data: {
        token,
        user: { 
          id: user._id, 
          email: user.email, 
          name: user.name,
          isAdmin: user.isAdmin 
        }
      }
    };

    res.status(200).json(responseData);
  } catch (error) {
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

    // Create response data with explicit admin status included
    const responseData = {
      ...user.toObject(),
      isAdmin: user.isAdmin || false
    };

    res.status(200).json({
      statusCode: 200,
      message: 'Profile fetched successfully',
      data: responseData
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
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to upload image',
      data: null
    });
  }
};

export class AuthController {
    async googleLogin(req: Request, res: Response) {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ message: 'Token is required' });
            }

            const googleUser = await googleAuthService.verifyGoogleToken(token);
            
            // Check if user exists
            let user = await User.findOne({ email: googleUser.email });
            let isNewUser = false;
            
            if (!user) {
                // Create new user if doesn't exist
                user = await User.create({
                    email: googleUser.email,
                    name: googleUser.name,
                    profilePicture: googleUser.picture,
                    googleId: googleUser.googleId,
                    isEmailVerified: true, // Google emails are verified
                    needsPasswordSetup: true // Flag to indicate password setup is needed
                });
                isNewUser = true;
            } else if (!user.googleId) {
                // If user exists but hasn't logged in with Google before
                user.googleId = googleUser.googleId;
                user.isEmailVerified = true;
                if (!user.password) {
                    user.needsPasswordSetup = true;
                }
                await user.save();
            }

            // Generate JWT token
            const jwtToken = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                token: jwtToken,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    profilePicture: user.profilePicture,
                    needsPasswordSetup: user.needsPasswordSetup,
                    isAdmin: user.isAdmin
                },
                isNewUser
            });
        } catch (error) {
            res.status(500).json({ message: 'Authentication failed' });
        }
    }

    async setPassword(req: Request, res: Response) {
        try {
            const { userId, password } = req.body;

            if (!userId || !password) {
                return res.status(400).json({ message: 'User ID and password are required' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Set the password and mark password setup as complete
            user.password = password;
            user.needsPasswordSetup = false;
            await user.save();

            res.json({ message: 'Password set successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to set password' });
        }
    }
}

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
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

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Current password is incorrect',
        data: null
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        statusCode: 400,
        message: 'New password cannot be the same as current password',
        data: null
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      statusCode: 200,
      message: 'Password changed successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to change password',
      data: null
    });
  }
}; 