import express from 'express';
import { auth } from '../middleware/auth.js';
import { getCustomPatentList, getSavedPatents, saveCustomPatentList, savePatent, removePatentFromFolder, extractPatentIdsFromFile } from '../controllers/savedPatentController.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Use a unique filename to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: (req, file, cb) => {
    // Accept only txt, doc, docx, xls, xlsx, csv files
    if (
      file.mimetype === 'text/plain' || 
      file.mimetype === 'application/msword' || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'text/csv'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt, .doc, .docx, .xls, .xlsx, or .csv files are allowed'));
    }
  }
});

// Protected routes - require authentication
// Use 'any' type to skip strict type checking for deployment
router.post('/', auth, savePatent as any);
router.get('/list', auth, getSavedPatents as any);
router.post('/save-custom-list', auth, saveCustomPatentList as any);
router.get('/custom-list', auth, getCustomPatentList as any);
router.post('/remove-from-folder', auth, removePatentFromFolder as any);

// New route for extracting patent IDs from files
router.post(
  '/extract-from-file', 
  auth, 
  upload.single('patentFile'),
  extractPatentIdsFromFile as any
);

export default router; 
