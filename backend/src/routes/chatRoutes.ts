import express from 'express';
import chatController from '../controllers/chatController';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware';

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

export default router; 