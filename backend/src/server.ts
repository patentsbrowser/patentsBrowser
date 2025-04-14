import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
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
app.use((req:any, res:any, next:any) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Configure CORS to allow requests from the frontend domain
app.use(cors({
  origin: [
    'https://patentsbrowser.com', 
    'https://www.patentsbrowser.com', 
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://patentsbrowser-backend.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Additional middleware to ensure CORS headers are set for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (
    origin === 'https://patentsbrowser.com' || 
    origin === 'https://www.patentsbrowser.com' || 
    origin === 'https://patentsbrowser-backend.onrender.com' || 
    origin.startsWith('http://localhost')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

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
    // Get the origin from the request, or use patentsbrowser.com as default
    const origin = res.req.headers.origin || 'https://patentsbrowser.com';
    
    // Only set allow-origin for valid origins
    if (origin === 'https://patentsbrowser.com' || 
        origin === 'https://www.patentsbrowser.com' || 
        origin === 'https://patentsbrowser-backend.onrender.com' || 
        origin.startsWith('http://localhost')) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
}));

// Serve uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    // Get the origin from the request, or use patentsbrowser.com as default
    const origin = res.req.headers.origin || 'https://patentsbrowser.com';
    
    // Only set allow-origin for valid origins
    if (origin === 'https://patentsbrowser.com' || 
        origin === 'https://www.patentsbrowser.com' || 
        origin === 'https://patentsbrowser-backend.onrender.com' || 
        origin.startsWith('http://localhost')) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patents', patentRoutes);
app.use('/api/saved-patents', savedPatentRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// Debug: Log all registered routes
console.log('============ REGISTERED ROUTES ============');
// First log our auth routes specifically
console.log('AUTH ROUTES:');
const authRouter = app._router.stack.find((middleware: any) => {
  return middleware.name === 'router' && 
         middleware.regexp.toString().includes('/api/auth');
});

if (authRouter) {
  authRouter.handle.stack.forEach((handler: any) => {
    if (handler.route) {
      const fullPath = handler.route.path;
      const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(',');
      console.log(`${methods} /api/auth${fullPath}`);
    }
  });
} else {
  console.log('Auth router not found!');
}

console.log('\nALL ROUTES:');
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    // Routes registered directly on the app
    const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(',');
    console.log(`${methods} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    // Router middleware
    const routerPath = middleware.regexp.toString();
    console.log(`Router: ${routerPath}`);
    
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        const fullPath = handler.route.path;
        const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(',');
        const routePattern = middleware.regexp.toString().replace(/[\\^$.*+?()[\]{}|]/g, '');
        const basePath = routePattern.replace(/\\\//g, '/').replace(/\?.*$/, '');
        console.log(`  ${methods} ${basePath}${fullPath}`);
      }
    });
  }
});
console.log('=========================================');

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