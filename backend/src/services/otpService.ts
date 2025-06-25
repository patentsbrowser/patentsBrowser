import nodemailer from 'nodemailer';
import { User } from '../models/User.js';
import { OTP } from '../models/OTP.js';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  dotenv.config({ path: '.env.production' });
} else if (env === 'stage') {
  dotenv.config({ path: '.env.stage' });
} else {
  dotenv.config();
}

// Configure email transporter
const createTransporter = async () => {
  try {
    // Check if email credentials are available
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_APP_PASSWORD;
    
    if (!emailUser || !emailPassword) {
      if (env === 'production') {
        console.error('Email credentials missing in production environment');
        throw new Error('Email service configuration failed');
      } else {
        console.warn('Email credentials missing. Using mock transporter for development.');
        return {
          verify: () => Promise.resolve(true),
          sendMail: (options) => {
            console.log('MOCK EMAIL SENT:', {
              to: options.to,
              subject: options.subject,
              otp: options.html.match(/\d{6}/)?.[0] || 'MOCK_OTP'
            });
            return Promise.resolve({ messageId: 'mock-message-id' });
          }
        } as any;
      }
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter
    await transporter.verify();
    console.log('Email transporter is ready to send emails');
    return transporter;
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    if (env === 'production') {
      throw new Error('Email service configuration failed');
    } else {
      console.warn('Using mock transporter in development...');
      return {
        verify: () => Promise.resolve(true),
        sendMail: (options) => {
          console.log('MOCK EMAIL SENT:', {
            to: options.to,
            subject: options.subject,
            otp: options.html.match(/\d{6}/)?.[0] || 'MOCK_OTP'
          });
          return Promise.resolve({ messageId: 'mock-message-id' });
        }
      } as any;
    }
  }
};

let transporter: nodemailer.Transporter | null = null;

// Initialize transporter
(async () => {
  try {
    transporter = await createTransporter();
  } catch (error) {
    console.error('Failed to initialize email transporter:', error);
  }
})();

export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('Generated new OTP:', otp);
  return otp;
};

export const sendOTP = async (email: string, otp: string) => {
  console.log('Starting OTP sending process for email:', email);
  
  if (!transporter) {
    console.log('Attempting to recreate transporter...');
    try {
      transporter = await createTransporter();
      console.log('Transporter recreated successfully');
    } catch (error) {
      console.error('Failed to recreate transporter:', error);
      if (env === 'production') {
        throw new Error('Email service is not available');
      } else {
        console.warn('Using mock email in development');
        console.log(`MOCK OTP for ${email}: ${otp}`);
        return true;
      }
    }
  }

  const mailOptions = {
    from: `"PatentsBrowser"`,
    to: email,
    subject: 'Your OTP for Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 5px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; padding: 15px; background-color: #1a365d; border-radius: 8px; color: #fff;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #fff;">PATENTS</div>
            <div style="font-size: 24px; font-weight: bold; color: #fff;">BROWSER</div>
            <div style="margin-top: 10px; background-color: #2f4f7d; padding: 8px; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 10px auto;">
              <div style="font-size: 24px; font-weight: bold; color: #fff;">⚖️</div>
            </div>
          </div>
        </div>
        <h2 style="color: #1a365d; text-align: center;">Email Verification</h2>
        <p style="text-align: center;">Your verification code is:</p>
        <h1 style="color: #2f4f7d; font-size: 32px; letter-spacing: 5px; text-align: center;">${otp}</h1>
        <p style="text-align: center;">This code will expire in 5 minutes.</p>
        <p style="text-align: center;">If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
        <div style="font-size: 12px; color: #666; margin-top: 20px; text-align: center;">
          <p><strong>DISCLAIMER:</strong> This email is from PatentsBrowser's automated system. The information contained in this email is confidential and may be legally privileged. It is intended solely for the addressee. Access to this email by anyone else is unauthorized.</p>
          <p><strong>NOTICE:</strong> This email was sent from a no-reply address. Please do not respond to this message as it was sent from an monitored mailbox. If you need assistance, please contact our support team.</p>
          <p>&copy; ${new Date().getFullYear()} PatentsBrowser. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // Try to recreate transporter on failure
    transporter = null;
    if (env === 'production') {
      throw new Error('Failed to send OTP email. Please try again.');
    } else {
      console.warn('Using mock email in development after send failure');
      console.log(`MOCK OTP for ${email}: ${otp}`);
      return true;
    }
  }
};

export const storeOTP = async (email: string, otp: string, type: 'signup' | 'login' | 'password_reset' = 'signup') => {
  console.log('Storing OTP for email:', email);
  
  try {
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type });
    
    // Create new OTP record
    const otpRecord = new OTP({
      email,
      otp,
      type,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });
    
    await otpRecord.save();
    console.log('OTP stored successfully in database');
  } catch (error) {
    console.error('Error storing OTP:', error);
    throw new Error('Failed to store OTP');
  }
};

export const verifyOTP = async (email: string, otp: string, type: 'signup' | 'login' | 'password_reset' = 'signup'): Promise<boolean> => {
  console.log('Verifying OTP for email:', email);
  
  try {
    const otpRecord = await OTP.findOne({ 
      email, 
      otp, 
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
  
    if (!otpRecord) {
      console.log('No valid OTP found for email:', email);
    return false;
  }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    console.log('OTP verified successfully for email:', email);
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
};

export const resendOTP = async (email: string, type: 'signup' | 'login' | 'password_reset' = 'signup') => {
  console.log('Resending OTP for email:', email);
  try {
    const otp = generateOTP();
    await sendOTP(email, otp);
    await storeOTP(email, otp, type);
    console.log('OTP resent successfully');
    return true;
  } catch (error) {
    console.error('Failed to resend OTP:', error);
    throw error;
  }
}; 