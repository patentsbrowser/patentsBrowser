import express from 'express';
import chatController from '../controllers/chatController';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware';
import { isAdmin } from '../middleware/adminMiddleware';

const router = express.Router();

// Route for sending and receiving chat messages
// This uses optional authentication to support both guest and authenticated users
router.post('/send', optionalAuthenticate, chatController.sendMessage);

// Route for retrieving messages from a specific session
// Also uses optional authentication to support guest access to their own sessions
router.get('/session/:sessionId', optionalAuthenticate, chatController.getSessionMessages);

// Route for getting all sessions for a user
// This requires full authentication since it's accessing user data
router.get('/user/sessions', authenticate, chatController.getUserSessions);

// Route for clearing a session
// This requires authentication to prevent unauthorized deletion
router.delete('/session/:sessionId', authenticate, chatController.clearSession);

// Admin routes for managing predefined Q&A pairs
// Get all predefined Q&A pairs with pagination and filtering
router.get('/qa', authenticate, isAdmin, chatController.getPredefinedQAs);

// Create a new predefined Q&A pair
router.post('/qa', authenticate, isAdmin, chatController.createPredefinedQA);

// Update an existing predefined Q&A pair
router.put('/qa/:id', authenticate, isAdmin, chatController.updatePredefinedQA);

// Delete a predefined Q&A pair
router.delete('/qa/:id', authenticate, isAdmin, chatController.deletePredefinedQA);

export default router; 