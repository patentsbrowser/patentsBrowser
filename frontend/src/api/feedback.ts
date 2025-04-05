import axiosInstance from './axiosConfig';

export interface FeedbackSubmission {
  email: string;
  comment: string;
}

export const feedbackApi = {
  // Submit feedback without authentication
  submitFeedback: async (feedback: FeedbackSubmission) => {
    try {
      const { data } = await axiosInstance.post(`/feedback/submit`, feedback);
      return data;
    } catch (error: any) {
      console.error('Feedback submission error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Get all feedback comments for the forum
  getFeedbackComments: async () => {
    try {
      const { data } = await axiosInstance.get(`/feedback/comments`);
      return data;
    } catch (error: any) {
      console.error('Error fetching feedback comments:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
}; 