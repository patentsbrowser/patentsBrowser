/**
 * Script to make a user an admin
 * Run with: npx ts-node src/scripts/makeUserAdmin.ts user@email.com
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';

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

// Get user email from command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Please provide a user email as an argument');
  process.exit(1);
}

// Connect to MongoDB and update user
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Find user by email
      const user = await User.findOne({ email: userEmail });
      
      if (!user) {
        console.error(`User with email ${userEmail} not found`);
        process.exit(1);
      }
      
      // Update user to be an admin
      user.isAdmin = true;
      await user.save();
      
      console.log(`User ${userEmail} is now an admin`);
      process.exit(0);
    } catch (error) {
      console.error('Error updating user:', error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 