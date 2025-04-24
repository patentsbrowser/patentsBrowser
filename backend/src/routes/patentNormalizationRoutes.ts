import express from 'express';
import { normalizePatents } from '../controllers/patentNormalizationController';

const router = express.Router();

router.post('/normalize', normalizePatents);

export default router; 