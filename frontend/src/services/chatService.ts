import axiosInstance from '../api/axiosConfig';
import { v4 as uuidv4 } from 'uuid';

interface ChatResponse {
  message: string;
  messageId: string;
  sessionId: string;
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
  },

  // Clear the current session
  async clearSession(): Promise<boolean> {
    try {
      // Make sure we have a session ID
      if (!this._sessionId) {
        return true; // Nothing to clear
      }

      await axiosInstance.delete(`/chat/session/${this._sessionId}`);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  }
};

export default chatService; 