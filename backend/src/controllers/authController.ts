import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { generateOTP, sendOTP, storeOTP, verifyOTP as verifyOTPService, resendOTP as resendOTPService } from '../services/otpService.js';
import { googleAuthService } from '../services/googleAuthService.js';
import { Organization } from '../models/Organization.js';
import { addPendingSignup, getPendingSignup, removePendingSignup, hasPendingSignup } from '../utils/pendingSignups.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, isOrganization, organizationName, organizationSize, organizationType } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        // Resend OTP for unverified user
        const otp = generateOTP();
        await storeOTP(email, otp, 'signup');
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
    await addPendingSignup(email, {
      signupData: { 
        name, 
        email, 
        password, 
        isOrganization, 
        organizationName, 
        organizationSize, 
        organizationType, 
        userType 
      },
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 min
    });

    await storeOTP(email, otp, 'signup');

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
    console.error('Error in signup:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Error initiating signup',
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

    // Only allow login if email is verified
    if (!user.isEmailVerified) {
      // Resend OTP for unverified user
      const otp = generateOTP();
      await storeOTP(email, otp, 'login');
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

    // Generate a new token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    // Update the user's activeToken and lastLogin
    user.activeToken = token;
    user.lastLogin = new Date();
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
          isAdmin: user.isAdmin,
          userType: user.userType,
          isOrganization: user.isOrganization,
          organizationRole: user.organizationRole,
          organizationName: user.organizationName
        }
      }
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in login:', error);
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
    console.error('Error in getProfile:', error);
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
    console.error('Error in updateProfile:', error);
    res.status(500).json({
      statusCode: 500,  
      message: 'Failed to update profile',
      data: null
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        data: null
      });
    }

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
    console.error('Error in logout:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Error logging out',
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

    // Update user's profile picture
    user.profilePicture = req.file.filename;
    await user.save();

    res.status(200).json({
      statusCode: 200,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: req.file.filename
      }
    });
  } catch (error) {
    console.error('Error in uploadImage:', error);
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
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({
          statusCode: 400,
          message: 'ID token is required',
          data: null
        });
            }

      const userData = await googleAuthService.verifyGoogleToken(idToken);
      
      if (!userData) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Invalid ID token',
          data: null
        });
      }

      let user = await User.findOne({ googleId: userData.googleId });
            
            if (!user) {
        // Create new user
        user = new User({
          googleId: userData.googleId,
          email: userData.email,
          name: userData.name,
          isEmailVerified: true,
          needsPasswordSetup: true
        });
                await user.save();
            }

      // Generate token
      const token = jwt.sign(
                { userId: user._id },
        JWT_SECRET,
                { expiresIn: '24h' }
            );

      user.activeToken = token;
      user.lastLogin = new Date();
      await user.save();

      res.status(200).json({
        statusCode: 200,
        message: 'Google login successful',
        data: {
          token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
            needsPasswordSetup: user.needsPasswordSetup
          }
        }
            });
        } catch (error) {
      console.error('Error in googleLogin:', error);
      res.status(500).json({
        statusCode: 500,
        message: 'Google login failed',
        data: null
      });
        }
    }

    async setPassword(req: Request, res: Response) {
        try {
      if (!req.user) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized',
          data: null
        });
      }

      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Password is required',
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

            user.password = password;
            user.needsPasswordSetup = false;
            await user.save();

      res.status(200).json({
        statusCode: 200,
        message: 'Password set successfully',
        data: null
      });
        } catch (error) {
      console.error('Error in setPassword:', error);
      res.status(500).json({
        statusCode: 500,
        message: 'Failed to set password',
        data: null
      });
        }
    }
}

export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        data: null
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Current password and new password are required',
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
    console.error('Error in changePassword:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to change password',
      data: null
    });
  }
};

// Handle organization signup with invite token
export const signupWithInvite = async (req: Request, res: Response) => {
  try {
    const { name, email, password, inviteToken } = req.body;

    // Validate invite token first
    const organization = await Organization.findOne({
      'inviteLinks.token': inviteToken,
      'inviteLinks.used': false,
      'inviteLinks.expiresAt': { $gt: new Date() }
    });

    if (!organization) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid or expired invite link'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        statusCode: 409,
        message: 'Email already registered'
      });
    }

    // Store signup data with organization info
    const otp = generateOTP();
    await addPendingSignup(email, {
      signupData: {
        name,
        email,
        password,
        inviteToken,
        organizationId: organization._id,
        userType: 'organization_member'
      },
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 min
    });

    await storeOTP(email, otp, 'signup');
    await sendOTP(email, otp);

    return res.status(200).json({
      statusCode: 200,
      message: 'OTP sent to your email. Please verify to complete signup.',
      data: { mode: 'verify' }
    });
  } catch (error) {
    console.error('Error in organization signup:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to process signup'
    });
  }
};

// Unified OTP verification for all signup types
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const isValid = await verifyOTPService(email, otp, 'signup');
    if (!isValid) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid or expired OTP'
      });
    }

    // Get pending signup data
    const pendingSignup = await getPendingSignup(email);
    if (!pendingSignup) {
      return res.status(400).json({
        statusCode: 400,
        message: 'No pending signup found'
      });
    }

    const { signupData } = pendingSignup;

    // Create user
    const user = new User({
      name: signupData.name,
      email: signupData.email,
      password: signupData.password,
      isEmailVerified: true,
      userType: signupData.userType || 'individual'
    });

    // Set organization fields if applicable
    if (signupData.isOrganization) {
      user.isOrganization = true;
      user.organizationName = signupData.organizationName;
      user.organizationSize = signupData.organizationSize;
      user.organizationType = signupData.organizationType;
      user.organizationRole = 'admin';
    }

    await user.save();

    // If this is an organization member signup
    if (signupData.inviteToken) {
      const organization = await Organization.findOne({
        'inviteLinks.token': signupData.inviteToken
      });

      if (organization) {
        // Add user as member
        organization.members.push({
          userId: user._id,
          role: 'member',
          joinedAt: new Date()
        });

        // Mark invite link as used
        const inviteLink = organization.inviteLinks.find(
          link => link.token === signupData.inviteToken
        );
        if (inviteLink) {
          inviteLink.used = true;
        }

        await organization.save();

        // Update user with organization details
        user.isOrganization = true;
        user.organizationName = organization.name;
        user.organizationSize = organization.size;
        user.organizationType = organization.type;
        user.organizationId = organization._id;
        user.organizationRole = 'member';
        await user.save();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    user.activeToken = token;
    user.lastLogin = new Date();
    await user.save();

    // Clean up pending signup
    await removePendingSignup(email);

    return res.status(200).json({
      statusCode: 200,
      message: 'Signup complete and email verified!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          isOrganization: user.isOrganization,
          organizationRole: user.organizationRole,
          organizationName: user.organizationName
        }
      }
    });
  } catch (error) {
    console.error('Error in OTP verification:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to verify OTP'
    });
  }
}; 