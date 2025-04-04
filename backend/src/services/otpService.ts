import nodemailer from 'nodemailer';
import { User } from '../models/User.js';

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map<string, { otp: string; timestamp: number }>();

// Configure email transporter
const createTransporter = async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
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
    throw new Error('Email service configuration failed');
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
  console.log('Current transporter status:', transporter ? 'Available' : 'Not available');
  console.log('Email configuration check:', {
    EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
    EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set'
  });
  
  if (!transporter) {
    console.log('Attempting to recreate transporter...');
    try {
      transporter = await createTransporter();
      console.log('Transporter recreated successfully');
    } catch (error) {
      console.error('Failed to recreate transporter:', error);
      throw new Error('Email service is not available');
    }
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('Email configuration is missing');
    throw new Error('Email service is not properly configured');
  }

  const mailOptions = {
    from: `"Algo Trading" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP for Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
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
    throw new Error('Failed to send OTP email. Please try again.');
  }
};

export const storeOTP = (email: string, otp: string) => {
  console.log('Storing OTP for email:', email);
  otpStore.set(email, {
    otp,
    timestamp: Date.now()
  });
  console.log('OTP stored successfully');
};

export const verifyOTP = (email: string, otp: string): boolean => {
  console.log('Verifying OTP for email:', email);
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    console.log('No OTP found for email:', email);
    return false;
  }

  // Check if OTP has expired (5 minutes)
  if (Date.now() - storedData.timestamp > 5 * 60 * 1000) {
    console.log('OTP has expired for email:', email);
    otpStore.delete(email);
    return false;
  }

  const isValid = storedData.otp === otp;
  if (isValid) {
    console.log('OTP verified successfully for email:', email);
    otpStore.delete(email);
  } else {
    console.log('Invalid OTP for email:', email);
  }
  
  return isValid;
};

export const resendOTP = async (email: string) => {
  console.log('Resending OTP for email:', email);
  try {
    const otp = generateOTP();
    await sendOTP(email, otp);
    storeOTP(email, otp);
    console.log('OTP resent successfully');
    return true;
  } catch (error) {
    console.error('Failed to resend OTP:', error);
    throw error;
  }
}; 