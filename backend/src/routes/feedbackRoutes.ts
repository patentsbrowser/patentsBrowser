import express from 'express';
import { getFeedbackComments, submitFeedback } from '../controllers/feedbackController.js';
// import { submitFeedback, getFeedbackComments } from '../controllers/feedbackController';

const router = express.Router();

// Public routes - no authentication required
router.post('/submit', submitFeedback);
router.get('/comments', getFeedbackComments);

export default router; 