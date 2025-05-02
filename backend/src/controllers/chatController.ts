import { Request, Response } from 'express';
import { ChatMessage, PredefinedQA } from '../models/ChatMessage';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import chatAIService from '../services/chatAIService';

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
    const response = await processMessage(message, patentId, userId);

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

// Admin methods for managing predefined Q&A pairs

// Get all predefined Q&A pairs with pagination and filtering
export const getPredefinedQAs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skipIndex = (page - 1) * limit;
    const category = req.query.category as string;
    const search = req.query.search as string;
    
    const query: any = {};
    
    // Apply category filter if provided
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Apply search filter if provided
    if (search) {
      query.$text = { $search: search };
    }
    
    const total = await PredefinedQA.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    
    let qaItems = [];
    if (search) {
      // If searching, sort by text score
      qaItems = await PredefinedQA.find(query)
        .sort({ score: { $meta: "textScore" } })
        .skip(skipIndex)
        .limit(limit);
    } else {
      // Otherwise sort by most recent
      qaItems = await PredefinedQA.find(query)
        .sort({ updatedAt: -1 })
        .skip(skipIndex)
        .limit(limit);
    }
    
    res.status(200).json({
      statusCode: 200,
      message: 'Predefined Q&A pairs retrieved successfully',
      data: {
        items: qaItems,
        page,
        limit,
        totalPages,
        total
      }
    });
  } catch (error) {
    console.error('Error retrieving predefined Q&A pairs:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve predefined Q&A pairs',
      data: null
    });
  }
};

// Create a new predefined Q&A pair
export const createPredefinedQA = async (req: Request, res: Response) => {
  try {
    const { question, answer, keywords, category, patentId } = req.body;
    
    // Validate required fields
    if (!question || !answer) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Question and answer fields are required',
        data: null
      });
    }
    
    // Create new Q&A pair
    const newQA = new PredefinedQA({
      question,
      answer,
      keywords: keywords || [],
      category: category || 'general',
      patentId: patentId || undefined
    });
    
    await newQA.save();
    
    res.status(201).json({
      statusCode: 201,
      message: 'Predefined Q&A pair created successfully',
      data: newQA
    });
  } catch (error) {
    console.error('Error creating predefined Q&A pair:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to create predefined Q&A pair',
      data: null
    });
  }
};

// Update an existing predefined Q&A pair
export const updatePredefinedQA = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { question, answer, keywords, category, patentId } = req.body;
    
    // Validate required fields
    if (!question || !answer) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Question and answer fields are required',
        data: null
      });
    }
    
    // Find and update the Q&A pair
    const updatedQA = await PredefinedQA.findByIdAndUpdate(
      id,
      {
        question,
        answer,
        keywords: keywords || [],
        category: category || 'general',
        patentId: patentId || undefined,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedQA) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Predefined Q&A pair not found',
        data: null
      });
    }
    
    res.status(200).json({
      statusCode: 200,
      message: 'Predefined Q&A pair updated successfully',
      data: updatedQA
    });
  } catch (error) {
    console.error('Error updating predefined Q&A pair:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to update predefined Q&A pair',
      data: null
    });
  }
};

// Delete a predefined Q&A pair
export const deletePredefinedQA = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await PredefinedQA.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Predefined Q&A pair not found',
        data: null
      });
    }
    
    res.status(200).json({
      statusCode: 200,
      message: 'Predefined Q&A pair deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting predefined Q&A pair:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to delete predefined Q&A pair',
      data: null
    });
  }
};

// Helper function to process messages and generate responses
const processMessage = async (message: string, patentId?: string, userId?: string): Promise<string> => {
  try {
    // Step 1: Try to find a matching predefined answer using AI and our database
    const aiMatch = await chatAIService.findBestMatch(message, patentId);
    if (aiMatch) {
      console.log('AI found a matching predefined answer');
      return aiMatch;
    }

    // Step 2: If no direct match, try the database text search
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

    // Step 3: If still no match, try to generate a response with AI
    const aiResponse = await chatAIService.generateAIResponse(message, patentId);
    if (aiResponse) {
      console.log('Using AI-generated response');
      return aiResponse;
    }

    // Step 4: Fallback to a simple response
    return "I'm sorry, I don't have enough information to answer that question. Is there something specific about the PatentsBrowser platform you'd like to know?";
  } catch (error) {
    console.error('Error processing message:', error);
    return "I apologize, but I encountered an issue processing your request. Please try again with a different question.";
  }
};

export default {
  sendMessage,
  getSessionMessages,
  getUserSessions,
  clearSession,
  getPredefinedQAs,
  createPredefinedQA,
  updatePredefinedQA,
  deletePredefinedQA
}; 