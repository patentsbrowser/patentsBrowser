import express from 'express';
import { searchGooglePatents } from '../controllers/googlePatentsController.js';

const router = express.Router();

router.get('/search', searchGooglePatents);

export default router; 