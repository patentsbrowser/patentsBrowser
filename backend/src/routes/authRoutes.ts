import express from 'express';
import { getProfile, login, updateProfile, uploadImage, AuthController, changePassword, signupWithInvite, verifyOTP as verifyOTPController } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTP, storeOTP, verifyOTP, resendOTP } from '../services/otpService.js';

const router = express.Router();
const authController = new AuthController();

// Temporary in-memory store for pending signups (for production, use Redis)
const pendingSignups = {};

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, isOrganization, organizationName, organizationSize, organizationType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        // Resend OTP for unverified user
        const otp = generateOTP();
        storeOTP(email, otp);
        try {
          await sendOTP(email, otp);
          console.log('OTP resent to existing unverified user:', email);
        } catch (e) {
          console.error('Failed to send OTP to existing user:', email, e);
        }
        return res.status(200).json({
          statusCode: 200,
          message: 'OTP sent to your email. Please verify to complete signup.',
          data: { mode: 'verify' }
        });
    } else {
        // Already registered and verified
        return res.status(409).json({
          statusCode: 409,
          message: 'Account already exists',
          data: { mode: 'login' }
        });
      }
    }

    // Determine userType based on registration type
    let userType = 'individual';
    if (isOrganization) {
      userType = 'organization_admin'; // Organization registrants become organization admins
    }

    // Store signup data in pendingSignups
    const otp = generateOTP();
    pendingSignups[email] = {
      signupData: { name, email, password, isOrganization, organizationName, organizationSize, organizationType, userType },
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 min
    };

    storeOTP(email, otp);

    try {
      await sendOTP(email, otp);
      console.log('Signup OTP sent successfully to:', email);
    } catch (e) {
      console.error('Failed to send signup OTP to:', email, e);
      // Continue anyway - OTP is stored and can be resent
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'OTP sent to your email. Please verify to complete signup.',
      data: { mode: 'verify' }
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error initiating signup',
      data: null
    });
  }
});

// Verify OTP route - Use controller function that handles both regular and organization signup
router.post('/verify-otp', verifyOTPController);

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Email not found',
        data: { mode: 'signup' }
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
    if (!user.isEmailVerified) {
      // Resend OTP for unverified user
      const otp = generateOTP();
      storeOTP(email, otp);
      try {
        await sendOTP(email, otp);
        console.log('Login OTP sent to unverified user:', email);
      } catch (e) {
        console.error('Failed to send login OTP:', email, e);
      }
      return res.status(200).json({
        statusCode: 200,
        message: 'OTP sent to your email. Please verify to login.',
        data: { mode: 'verify' }
      });
    }
    // Normal login
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
    user.activeToken = token;
    user.lastLogin = new Date();
    await user.save();
    return res.status(200).json({
      statusCode: 200,
      message: 'Successfully logged in!',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          userType: user.userType,
          isOrganization: user.isOrganization,
          organizationRole: user.organizationRole
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Login failed. Please try again.',
      data: null
    });
  }
});

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

    // Check if user is in pending signups (for signup flow)
    if (pendingSignups[email]) {
      console.log('Resending OTP for pending signup:', email);
      const otp = generateOTP();

      // Update pending signup with new OTP
      pendingSignups[email].otp = otp;
      pendingSignups[email].expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

      storeOTP(email, otp);
      try {
        await sendOTP(email, otp);
        console.log('OTP resent successfully for pending signup:', email);
      } catch (e) {
        console.error('Failed to send OTP email:', e);
      }

      return res.status(200).json({
        statusCode: 200,
        message: 'OTP resent successfully',
        data: null
      });
    }

    // Check if user exists in database (for existing unverified users)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found. Please signup first.',
        data: null
      });
    }

    // Only resend if user is not verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email is already verified',
        data: null
      });
    }

    // Generate and send new OTP for existing unverified user
    console.log('Resending OTP for existing unverified user:', email);
    await resendOTP(email);

    res.status(200).json({
      statusCode: 200,
      message: 'OTP resent successfully',
      data: null
    });
  } catch (error) {
    console.error('Error in resend OTP:', error);
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
    res.status(500).json({
      statusCode: 500,
      message: 'Error logging out',
      data: null
    });
  }
});

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
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to reset password',
      data: null
    });
  }
});

// Add new route for organization signup with invite
router.post('/signup-with-invite', signupWithInvite);

export default router; 