import { Request, Response } from 'express';
import { PatentReadStatus } from '../models/PatentReadStatus.js';
import { standardizePatentNumber } from '../utils/patentUtils.js';

type AuthRequest = Request & {
  user?: {
    userId: string;
  };
  body: any;
};

// Mark a patent as read
export const markPatentAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { patentId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    if (!patentId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Patent ID is required',
        data: null
      });
    }

    const standardizedPatentId = standardizePatentNumber(patentId.trim());

    // Use findOneAndUpdate with upsert to handle duplicates
    const result = await PatentReadStatus.findOneAndUpdate(
      { userId, patentId: standardizedPatentId },
      { $set: { readAt: new Date() } },
      { upsert: true, new: true }
    );

    res.status(200).json({
      statusCode: 200,
      message: 'Patent marked as read',
      data: result
    });
  } catch (error) {
    console.error('Error marking patent as read:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to mark patent as read',
      data: null
    });
  }
};

// Get all read patents for a user
export const getReadPatents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    const readPatents = await PatentReadStatus.find({ userId })
      .sort({ readAt: -1 });

    res.status(200).json({
      statusCode: 200,
      message: 'Read patents retrieved successfully',
      data: readPatents.map(p => p.patentId)
    });
  } catch (error) {
    console.error('Error fetching read patents:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch read patents',
      data: null
    });
  }
};

// Check if multiple patents are read
export const checkPatentsReadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { patentIds } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    if (!patentIds || !Array.isArray(patentIds)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Patent IDs array is required',
        data: null
      });
    }

    const standardizedPatentIds = patentIds.map(id => standardizePatentNumber(id.trim()));

    const readPatents = await PatentReadStatus.find({
      userId,
      patentId: { $in: standardizedPatentIds }
    });

    const readPatentIds = new Set(readPatents.map(p => p.patentId));

    const result = standardizedPatentIds.map(id => ({
      patentId: id,
      isRead: readPatentIds.has(id),
      readAt: readPatents.find(p => p.patentId === id)?.readAt
    }));

    res.status(200).json({
      statusCode: 200,
      message: 'Patent read status retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error checking patents read status:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to check patents read status',
      data: null
    });
  }
}; 