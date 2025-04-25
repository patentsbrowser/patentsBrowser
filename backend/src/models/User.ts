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
  role: string;
  currentPlan: string;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  trialStartDate: Date;
  isPendingPayment: boolean;
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
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
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
    enum: ['inactive', 'trial', 'active'],
    default: 'trial'
  },
  currentPlan: {
    type: String,
    enum: ['free', 'monthly', 'quarterly', 'yearly'],
    default: 'free'
  },
  subscriptionStartDate: {
    type: Date
  },
  subscriptionEndDate: {
    type: Date
  },
  trialStartDate: {
    type: Date,
    default: Date.now
  },
  isPendingPayment: {
    type: Boolean,
    default: false
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
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = new Date();
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model<IUser>('User', userSchema); 