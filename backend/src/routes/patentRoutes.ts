import express from 'express';
import { searchPatents } from '../controllers/patentController.js';

const router = express.Router();

router.get('/search', searchPatents);

export default router; 