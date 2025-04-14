/**
 * Simple script to create an admin user
 * Run with: node scripts/createAdmin.js admin@example.com Admin123!
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env.production') });
} else if (env === 'stage') {
  dotenv.config({ path: path.join(__dirname, '../.env.stage') });
} else {
  dotenv.config();
}

// Get MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patent_db';

// Get user email and password from command line arguments
const userEmail = process.argv[2];
const userPassword = process.argv[3];

if (!userEmail || !userPassword) {
  console.error('Please provide an email and password as arguments');
  process.exit(1);
}

// Define a simplified User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  isEmailVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Add password hashing hook
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Create the User model
const User = mongoose.model('User', userSchema);

async function createAdminUser(email, password) {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log(`User with email ${email} already exists. Making them an admin...`);
      existingUser.isAdmin = true;
      existingUser.isEmailVerified = true;
      await existingUser.save();
      console.log(`User ${email} is now an admin`);
    } else {
      // Create new user
      const newUser = new User({
        email,
        password,
        name: 'Admin User',
        isAdmin: true,
        isEmailVerified: true,
      });
      
      await newUser.save();
      console.log(`Admin user ${email} created successfully`);
    }
    
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    if (mongoose.connection) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

createAdminUser(userEmail, userPassword); 