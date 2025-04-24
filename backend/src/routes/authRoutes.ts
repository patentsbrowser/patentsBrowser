import express from 'express';
import { getProfile, login, logout, signup, updateProfile, uploadImage, checkAdminStatus, AuthController, changePassword } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTP, storeOTP, verifyOTP, resendOTP } from '../services/otpService.js';

const router = express.Router();
const authController = new AuthController();

// Signup route
router.post('/signup', async (req:any, res:any) => {
  try {
    const { name, email, password } = req.body;
    console.log('Signup request received for email:', email);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({
        statusCode: 400,
        message: 'User already exists',
        data: null
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password
    });

    await user.save();
    console.log('New user created:', email);

    // Generate and send OTP
    const otp = generateOTP();
    console.log('Generated OTP:', otp);
    
    try {
      await sendOTP(email, otp);
      console.log('OTP sent successfully to:', email);
      storeOTP(email, otp);
      console.log('OTP stored for:', email);
    } catch (emailError) {
      console.error('Error sending OTP:', emailError);
      // Continue with the response even if email fails
    }

    res.status(201).json({
      statusCode: 201,
      message: 'Account created! Please verify your email.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Error creating account',
      data: null
    });
  }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email and OTP are required',
        data: null
      });
    }

    const isValid = verifyOTP(email, otp);
    
    if (!isValid) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid or expired OTP',
        data: null
      });
    }

    // Update user's email verification status
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { isEmailVerified: true } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update the user's activeToken and lastLogin
    user.activeToken = token;
    user.lastLogin = new Date();
    await user.save();
    
    console.log('User verified and logged in successfully, token updated');

    res.status(200).json({
      statusCode: 200,
      message: 'OTP verified successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin
        }
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      data: null
    });
  }
});

// Login route
router.post('/login', login);

// Resend OTP route
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email is required',
        data: null
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Generate and send new OTP
    await resendOTP(email);
    
    res.status(200).json({
      statusCode: 200,
      message: 'OTP resent successfully',
      data: null
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to resend OTP',
      data: null
    });
  }
});

// Logout route
router.post('/logout', auth, async (req, res) => {
  try {
    // Clear the activeToken from the user's record
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { activeToken: null } },
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
      message: 'Logged out successfully',
      data: null
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Error logging out',
      data: null
    });
  }
});

// Check admin status route
router.get('/check-admin', auth, checkAdminStatus);

router.get('/profile', auth, getProfile);
router.post('/update-profile', auth, updateProfile);
router.post('/upload-image', auth, upload.single('profileImage'), uploadImage);

// Google Authentication routes
router.post('/google-login', authController.googleLogin);
router.post('/set-password', auth, authController.setPassword);
router.post('/change-password', auth, changePassword);

// Send OTP for forgot password
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email is required',
        data: null
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Generate and send OTP
    const otp = generateOTP();
    await sendOTP(email, otp);
    storeOTP(email, otp);
    
    res.status(200).json({
      statusCode: 200,
      message: 'OTP sent successfully',
      data: null
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to send OTP',
      data: null
    });
  }
});

// Reset password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email, OTP, and new password are required',
        data: null
      });
    }

    // Verify OTP
    const isValid = verifyOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid or expired OTP',
        data: null
      });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
        data: null
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      statusCode: 200,
      message: 'Password reset successful',
      data: null
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to reset password',
      data: null
    });
  }
});

export default router; 