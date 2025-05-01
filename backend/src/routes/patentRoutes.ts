import express from 'express';
import { searchPatents, searchMultiplePatents, filterPatentsByFamily } from '../controllers/patentController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Search patents with pagination
router.get('/search', auth, searchPatents);
router.post('/filter-by-family', auth, filterPatentsByFamily);

// Search multiple patents with pagination
router.post('/search-multiple', auth, searchMultiplePatents);

export default router; 