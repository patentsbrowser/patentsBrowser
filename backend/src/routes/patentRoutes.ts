import express from 'express';
import { searchPatents, searchMultiplePatents } from '../controllers/patentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Search patents with pagination
router.get('/search', authenticateToken, searchPatents);

// Search multiple patents with pagination
router.post('/search-multiple', authenticateToken, searchMultiplePatents);

export default router; 