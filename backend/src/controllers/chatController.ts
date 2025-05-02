import { Request, Response } from 'express';
import { ChatMessage, PredefinedQA } from '../models/ChatMessage';
import { v4 as uuidv4 } from 'uuid';

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message, patentId } = req.body;
    let { sessionId } = req.body;
    const userId = req.user?._id;

    // If no sessionId provided, create a new one
    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Process the message and generate a response
    const response = await processMessage(message, patentId);

    // Save the message and response to the database
    const chatMessage = new ChatMessage({
      userId,
      sessionId,
      patentId,
      message,
      response,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    await chatMessage.save();

    res.status(200).json({
      statusCode: 200,
      message: 'Message processed successfully',
      data: {
        response,
        messageId: chatMessage._id,
        sessionId
      }
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to process message',
      data: null
    });
  }
};

export const getSessionMessages = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?._id;

    // Create a query that matches either the user's authenticated session
    // or a non-authenticated session with the same sessionId
    const query: any = { sessionId };
    if (userId) {
      // If user is authenticated, we can include their user ID in the query
      // This allows retrieving either their authenticated messages or anonymous ones
      query.$or = [{ userId }, { userId: { $exists: false } }];
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(100); // Limit to prevent overwhelming responses

    res.status(200).json({
      statusCode: 200,
      message: 'Session messages retrieved successfully',
      data: {
        messages,
        sessionId
      }
    });
  } catch (error) {
    console.error('Error retrieving session messages:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve session messages',
      data: null
    });
  }
};

export const getUserSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required to retrieve user sessions',
        data: null
      });
    }

    // Get distinct sessionIds for this user
    const sessions = await ChatMessage.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      { $group: { 
        _id: '$sessionId',
        lastMessage: { $first: '$message' },
        lastResponse: { $first: '$response' },
        lastUpdated: { $first: '$createdAt' },
        messageCount: { $sum: 1 },
        patentId: { $first: '$patentId' }
      }},
      { $sort: { lastUpdated: -1 } }
    ]);

    res.status(200).json({
      statusCode: 200,
      message: 'User sessions retrieved successfully',
      data: {
        sessions
      }
    });
  } catch (error) {
    console.error('Error retrieving user sessions:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve user sessions',
      data: null
    });
  }
};

export const clearSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?._id;

    // Create a query that ensures we only delete the user's own sessions
    const query: any = { sessionId };
    if (userId) {
      query.userId = userId;
    } else {
      // For anonymous users, we need some way to verify ownership
      // This could be a token or other identifier stored in a cookie
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required to clear sessions',
        data: null
      });
    }

    await ChatMessage.deleteMany(query);

    res.status(200).json({
      statusCode: 200,
      message: 'Session cleared successfully',
      data: null
    });
  } catch (error) {
    console.error('Error clearing session:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to clear session',
      data: null
    });
  }
};

// Helper function to process messages and generate responses
const processMessage = async (message: string, patentId?: string): Promise<string> => {
  // First check if we have a predefined answer
  if (patentId) {
    const patentSpecificQA = await PredefinedQA.findOne({
      $and: [
        { patentId },
        { $text: { $search: message } }
      ]
    }).sort({ score: { $meta: "textScore" } });

    if (patentSpecificQA) {
      return patentSpecificQA.answer;
    }
  }

  // Look for general predefined QA
  const generalQA = await PredefinedQA.findOne({
    $text: { $search: message }
  }).sort({ score: { $meta: "textScore" } });

  if (generalQA) {
    return generalQA.answer;
  }

  // If no predefined answer found, generate a basic response
  // In a real implementation, this could call an LLM API
  const basicResponses = [
    "I understand you're asking about this patent. Could you clarify what specific information you're looking for?",
    "That's an interesting question about the patent. I'm processing your query and will have an answer shortly.",
    "I'm analyzing the patent data to provide you with the most accurate information about your question.",
    "Let me research this patent further to give you a comprehensive answer to your question."
  ];

  return basicResponses[Math.floor(Math.random() * basicResponses.length)];
};

export default {
  sendMessage,
  getSessionMessages,
  getUserSessions,
  clearSession
}; 