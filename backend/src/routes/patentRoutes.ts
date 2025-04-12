import express from 'express';
import { searchPatents, searchMultiplePatents } from '../controllers/patentController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Search patents with pagination
router.get('/search', auth, searchPatents);

// Search multiple patents with pagination
router.post('/search-multiple', auth, searchMultiplePatents);

export default router; 