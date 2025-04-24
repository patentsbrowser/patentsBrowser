import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { SubscriptionStatus } from './Subscription.js';

interface IUser extends mongoose.Document {
  email: string;
  password: string;
  name?: string;
  createdAt: Date;
  paymentStatus: string;
  address: string;
  number: string;
  phoneCode: string;
  imageUrl: string;
  gender: string;
  nationality: string;  
  comparePassword(candidatePassword: string): Promise<boolean>;
  isEmailVerified: boolean;
  activeToken: string;
  lastLogin: Date;
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: Date;
  googlePayCustomerId?: string;
  referenceNumber?: string;
  isAdmin: boolean;
  profilePicture: string;
  googleId: string;
  updatedAt: Date;
  needsPasswordSetup: boolean;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false, // Not required for Google login
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  activeToken: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.TRIAL
  },
  trialEndDate: {
    type: Date,
    default: function() {
      // Set trial end date to 14 days from now
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date;
    }
  },
  googlePayCustomerId: {
    type: String
  },
  referenceNumber: {
    type: String,
    default: ''
  },
  address:{
    type: String,
    default: ''
  },
  number:{
    type: String,
    default: ''
  },
  phoneCode:{
    type: String,
    default: ''
  },
  imageUrl:{
    type: String,
    default: ''
  },
  gender:{
    type: String,
    enum: ['male', 'female', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  nationality:{
    type: String,
    default: ''
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: '',
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
  needsPasswordSetup: {
    type: Boolean,
    default: false
  },
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = new Date();
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema); 