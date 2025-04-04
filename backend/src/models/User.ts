import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
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
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema); 