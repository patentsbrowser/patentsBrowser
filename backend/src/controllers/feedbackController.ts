import { Request, Response } from 'express';
import Feedback from '../models/Feedback.js';
// import Feedback from '../models/Feedback';

// Submit feedback without requiring authentication
export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { email, comment } = req.body;

    // Validate inputs
    if (!email || !comment) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email and comment are required'
      });
    }

    // Create new feedback entry
    const feedback = new Feedback({
      email,
      comment,
      date: new Date()
    });

    // Save to database
    await feedback.save();

    return res.status(200).json({
      statusCode: 200,
      message: 'Feedback submitted successfully',
      data: {
        id: feedback._id,
        email: feedback.email,
        comment: feedback.comment,
        date: feedback.date
      }
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Error submitting feedback'
    });
  }
};

// Get all feedback comments for display in the forum
export const getFeedbackComments = async (_req: Request, res: Response) => {
  try {
    // Get all feedback entries, sorted by date (newest first)
    const comments = await Feedback.find()
      .sort({ date: -1 })
      .select('email comment date');

    return res.status(200).json({
      statusCode: 200,
      message: 'Feedback comments retrieved successfully',
      data: comments
    });
  } catch (error) {
    console.error('Error fetching feedback comments:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Error fetching feedback comments'
    });
  }
}; 