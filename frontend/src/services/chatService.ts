import axiosInstance from '../api/axiosConfig';
import { v4 as uuidv4 } from 'uuid';

interface ChatResponse {
  message: string;
  messageId: string;
  sessionId: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface FeedbackData {
  helpful: boolean;
  comment?: string;
}

// This service is responsible for handling chat interactions with the backend
export const chatService = {
  // Maintain the current session ID
  _sessionId: localStorage.getItem('chatSessionId') || '',

  // Initialize chat session - called when chat component mounts
  initSession() {
    // If no session ID exists, create one and store it
    if (!this._sessionId) {
      this._sessionId = uuidv4();
      localStorage.setItem('chatSessionId', this._sessionId);
    }
    return this._sessionId;
  },

  // Get the current session ID
  getSessionId() {
    return this._sessionId;
  },

  // Create a new session
  createNewSession() {
    this._sessionId = uuidv4();
    localStorage.setItem('chatSessionId', this._sessionId);
    return this._sessionId;
  },

  // Get welcome message based on user authentication status
  getWelcomeMessage(): string {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user: User = JSON.parse(userData);
        return `Welcome back, ${user.name}! How can I help you today?`;
      } else {
        return "Welcome! How can I assist you with your patent search today?";
      }
    } catch (error) {
      console.error('Error getting welcome message:', error);
      return "Welcome! How can I assist you with your patent search today?";
    }
  },

  // Send a message to the AI and get a response
  async sendMessage(
    message: string, 
    patentId?: string
  ): Promise<ChatResponse> {
    try {
      // Make sure we have a session ID
      if (!this._sessionId) {
        this.initSession();
      }

      // Call the backend API
      const response = await axiosInstance.post('/chat/send', {
        message,
        patentId,
        sessionId: this._sessionId,
        timestamp: new Date().toISOString()
      });

      // Update session ID if a new one was created
      if (response.data?.data?.sessionId) {
        this._sessionId = response.data.data.sessionId;
        localStorage.setItem('chatSessionId', this._sessionId);
      }

      return {
        message: response.data.data.response,
        messageId: response.data.data.messageId,
        sessionId: this._sessionId
      };
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Return an error message instead of using mock response
      return {
        message: "I'm having trouble connecting to the server. Please try again later.",
        messageId: Date.now().toString(),
        sessionId: this._sessionId
      };
    }
  },

  // Submit feedback for a chat message
  async submitFeedback(messageId: string, feedback: FeedbackData): Promise<boolean> {
    try {
      const response = await axiosInstance.post(`/chat/feedback/${messageId}`, feedback);
      return response.status === 200;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  },

  // Get all messages for the current session
  async getSessionMessages(): Promise<any[]> {
    try {
      // Make sure we have a session ID
      if (!this._sessionId) {
        this.initSession();
      }

      const response = await axiosInstance.get(`/chat/session/${this._sessionId}`);
      return response.data.data.messages || [];
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  },

  // Get all sessions for the current user (requires authentication)
  async getUserSessions(): Promise<any[]> {
    try {
      const response = await axiosInstance.get('/chat/user/sessions');
      return response.data.data.sessions || [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }
};

export default chatService; 