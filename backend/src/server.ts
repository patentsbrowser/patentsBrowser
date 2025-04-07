import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import patentRoutes from './routes/patentRoutes.js';
import savedPatentRoutes from './routes/savedPatentRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import { createDefaultPlans } from './models/PricingPlan.js';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env} environment`);

if (env === 'production') {
  dotenv.config({ path: '.env.production' });
} else if (env === 'stage') {
  dotenv.config({ path: '.env.stage' });
} else {
  dotenv.config();
}
console.log('first')
// Verify required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  if (env === 'production') {
    process.exit(1); // Only exit in production
  } else {
    console.warn('Continuing without required environment variables. Some features may not work properly.');
  }
}

// Optional environment variables check
const optionalEnvVars = ['EMAIL_USER', 'EMAIL_APP_PASSWORD'];
const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptionalVars.length > 0) {
  console.warn('Missing optional environment variables:', missingOptionalVars);
  console.warn('Email functionality may not work properly.');
}

// Log successful environment loading
if (missingEnvVars.length === 0) {
  console.log('Required environment variables loaded successfully');
}

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Configure CORS to allow only requests from the frontend URL
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://patentsbrowser.com',
      'https://patentsbrowser.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// app.use(cors(corsOptions));
app.use(cors({
  origin: 'https://patentsbrowser.com', // or use an array for multiple domains
  credentials: true, // if you are using cookies or authorization headers
}));
app.use(express.json());

// Health check endpoint for Render monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: env });
});

// Make sure uploadedImages directory is served as public
const uploadDir = path.join(__dirname, '../uploadedImages');
console.log('Upload directory path: ', uploadDir);

// Ensure upload directory exists
import fs from 'fs';
if (!fs.existsSync(uploadDir)) {
  console.log('Creating upload directory');
  fs.mkdirSync(uploadDir, { recursive: true });
} else {
  console.log('Upload directory already exists');
}

app.use('/uploadedImages', express.static(uploadDir, {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://patentsbrowser.com');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Serve uploaded images as static files
app.use('/uploads/images', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://patentsbrowser.com',
    'http://localhost:3000'
  ];
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  }
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static(path.join(__dirname, '../uploads/images')));

// Serve uploaded files as static files
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://patentsbrowser.com',
    'http://localhost:3000'
  ];
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  }
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Serve images directory
app.use('/images', express.static(path.join(__dirname, '../images'), {
  setHeaders: (res, filePath) => {
    // We can't access req.headers.origin in the setHeaders function
    // Default to allowing the configured frontend URL
    res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://patentsbrowser.com');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patents', patentRoutes);
app.use('/api/saved-patents', savedPatentRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/feedback', feedbackRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patent_db';

// Check if the connection string is for MongoDB Atlas
const isAtlasConnection = MONGODB_URI.includes('mongodb+srv://');
console.log(`Using ${isAtlasConnection ? 'MongoDB Atlas' : 'local MongoDB'} database`);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Initialize default pricing plans
    try {
      await createDefaultPlans();
    } catch (error) {
      console.error('Error creating default pricing plans:', error);
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Use API_URL from environment if available, otherwise use localhost
      const apiUrl = process.env.API_URL || `http://localhost:${PORT}/api`;
      console.log(`API URL: ${apiUrl}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    if (isAtlasConnection && err.name === 'MongoTimeoutError') {
      console.error('Connection to MongoDB Atlas timed out. Check your network and connection string.');
    } else if (err.name === 'MongoParseError') {
      console.error('Invalid MongoDB connection string. Please check the format.');
    }
  }); 