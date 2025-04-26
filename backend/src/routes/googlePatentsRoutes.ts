import express from 'express';
import { searchGooglePatents } from '../controllers/googlePatentsController.js';
// import { searchGooglePatents } from '../controllers/googlePatentsController';

const router = express.Router();

router.get('/search', searchGooglePatents);

export default router; 