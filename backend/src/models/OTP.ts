import mongoose from 'mongoose';

interface IOTP extends mongoose.Document {
  email: string;
  otp: string;
  type: 'signup' | 'login' | 'password_reset';
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['signup', 'login', 'password_reset'],
    default: 'signup'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired documents
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Create indexes for efficient queries
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ email: 1, otp: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema); 