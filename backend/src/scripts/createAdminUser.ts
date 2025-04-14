/**
 * Script to create a new admin user
 * Run with: npx ts-node --esm src/scripts/createAdminUser.ts admin@example.com adminPassword
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env.production') });
} else if (env === 'stage') {
  dotenv.config({ path: path.join(__dirname, '../../.env.stage') });
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

async function createAdminUser(email: string, password: string) {
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
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const newUser = new User({
        email,
        password: hashedPassword,
        name: 'Admin User',
        isAdmin: true,
        isEmailVerified: true,
      });
      
      await newUser.save();
      console.log(`Admin user ${email} created successfully`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(userEmail, userPassword); 