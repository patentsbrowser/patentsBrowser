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
router.post('/', auth, savePatent as express.RequestHandler);
router.get('/list', auth, getSavedPatents as express.RequestHandler);
router.post('/save-custom-list', auth, saveCustomPatentList as express.RequestHandler);
router.get('/custom-list', auth, getCustomPatentList as express.RequestHandler);
router.post('/remove-from-folder', auth, removePatentFromFolder as express.RequestHandler);

// New route for extracting patent IDs from files
router.post(
  '/extract-from-file', 
  auth, 
  upload.single('patentFile'),
  extractPatentIdsFromFile as express.RequestHandler
);

export default router; 
