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

// Helper function to process messages and generate responses
const processMessage = async (message: string, patentId?: string, userId?: string): Promise<string> => {
  // Special handling for welcome-type messages
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage === 'hey') {
    // If we have a userId, try to get the user's name
    if (userId) {
      try {
        const userDoc = await mongoose.model('User').findById(userId);
        if (userDoc && userDoc.name) {
          return `Hello, ${userDoc.name}! I'm PB Assistant, your patent expert. How can I help you today?`;
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        // Continue with default response if there's an error
      }
    }
  }

  // Special handling for platform feature questions
  if (
    lowerMessage.includes('feature') || 
    lowerMessage.includes('platform') || 
    lowerMessage.includes('what can you do') || 
    lowerMessage.includes('benefits') ||
    lowerMessage.includes('capabilities')
  ) {
    return `
      PatentsBrowser offers several powerful features to enhance patent research:
      
      1) Patent Highlighter: Supports complex search patterns to quickly identify relevant text in patents
      2) Smart Search: Automatically transforms and corrects patent IDs to proper format
      3) Workflow Management: Create folders to organize patents and avoid duplicate reviews
      4) AI Assistant (Beta): Helps generate patent summaries and analysis reports
      5) Batch Processing: Upload files to extract multiple patent IDs with a single click
      
      Which feature would you like to learn more about?
    `;
  }

  // Patent Highlighter details
  if (
    lowerMessage.includes('highlighter') || 
    lowerMessage.includes('highlight') || 
    lowerMessage.includes('search pattern') ||
    lowerMessage.includes('complex search')
  ) {
    return `
      The Patent Highlighter supports advanced search patterns including:
      
      • Boolean operators (AND, OR, NOT)
      • Proximity search (finding terms within a certain distance)
      • Wildcard searching (partial term matching)
      • Phrase matching (exact sequences of words)
      • Field-specific search (title, abstract, claims, description)
      • Synonym expansion (finds related terms automatically)
      
      This allows researchers to quickly identify relevant sections within lengthy patent documents, significantly reducing manual review time.
    `;
  }

  // Smart Search details
  if (
    lowerMessage.includes('smart search') || 
    lowerMessage.includes('patent id') || 
    lowerMessage.includes('transform') ||
    lowerMessage.includes('format correction') ||
    lowerMessage.includes('auto correct')
  ) {
    return `
      The Smart Search feature automatically transforms and corrects patent IDs to their proper format. It can:
      
      • Convert between different patent ID formats (US8123456 → US-8,123,456-B2)
      • Fix common typos and format errors
      • Add missing country codes or publication details
      • Normalize different patent ID representations to a standard format
      • Process multiple IDs at once, even from unstructured text
      
      This eliminates manual correction and ensures consistent, accurate patent references throughout your research.
    `;
  }

  // Workflow Management details
  if (
    lowerMessage.includes('folder') || 
    lowerMessage.includes('workflow') || 
    lowerMessage.includes('organize') ||
    lowerMessage.includes('duplicate')
  ) {
    return `
      The Workflow Management system helps organize your patent research by:
      
      • Creating folders for different research projects or topics
      • Saving patents with notes and custom tags
      • Automatically detecting duplicates across workfiles
      • Tracking which patents you've already reviewed
      • Providing collaboration features for team research
      
      When creating a new workfile inside a folder, the system can automatically filter out patents you've already reviewed, ensuring efficient progression through large patent sets.
    `;
  }

  // AI features
  if (
    lowerMessage.includes('ai') || 
    lowerMessage.includes('assistant') || 
    lowerMessage.includes('report') ||
    lowerMessage.includes('summary') ||
    lowerMessage.includes('upcoming')
  ) {
    return `
      Our upcoming AI Assistant feature will help with:
      
      • Generating concise patent summaries
      • Identifying key innovations in patent text
      • Creating comparison reports between multiple patents
      • Extracting relevant technical information
      • Suggesting related patents based on content analysis
      
      This will significantly reduce the time needed to understand complex patents and produce research reports. The feature is currently in beta and will be fully available soon.
    `;
  }

  // Batch processing
  if (
    lowerMessage.includes('upload') || 
    lowerMessage.includes('extract') || 
    lowerMessage.includes('batch') ||
    lowerMessage.includes('file') ||
    lowerMessage.includes('multiple patents')
  ) {
    return `
      The Batch Processing feature allows you to:
      
      • Upload documents containing patent references
      • Automatically extract all patent IDs
      • Correct and standardize the format of extracted IDs
      • Import them directly into your workflow
      • Process hundreds of patents with a single click
      
      This is particularly useful when dealing with prior art search results, office actions, or competitor analysis documents that mention multiple patents.
    `;
  }

  try {
    // Step 1: Try to find a matching predefined answer using AI
    const aiMatch = await chatAIService.findBestMatch(message, patentId);
    if (aiMatch) {
      console.log('AI found a matching predefined answer');
      return aiMatch;
    }

    // Step 2: If no AI match, check through our special cases
    // ... (keep all your existing special cases for feature matching)

    // Step 3: If no special case matches, try the database text search
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

    // Step 4: If still no match, try to generate a response with AI
    const aiResponse = await chatAIService.generateAIResponse(message, patentId);
    if (aiResponse) {
      console.log('Using AI-generated response');
      return aiResponse;
    }

    // Step 5: Fallback to basic responses
    const basicResponses = [
      "I understand you're asking about this patent. Could you clarify what specific information you're looking for?",
      "That's an interesting question about the patent. I'm processing your query and will have an answer shortly.",
      "I'm analyzing the patent data to provide you with the most accurate information about your question.",
      "Let me research this patent further to give you a comprehensive answer to your question."
    ];

    return basicResponses[Math.floor(Math.random() * basicResponses.length)];
  } catch (error) {
    console.error('Error processing message:', error);
    return "I apologize, but I encountered an issue processing your request. Please try again with a different question.";
  }
};

export default {
  sendMessage,
  getSessionMessages,
  getUserSessions,
  clearSession
}; 