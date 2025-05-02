import axiosInstance from '../api/axiosConfig';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

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
      const response = await axiosInstance.post('/api/chat/send', {
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
      
      // Fall back to mock response if API call fails
      return this.mockResponse(message, patentId);
    }
  },

  // Get all messages for the current session
  async getSessionMessages(): Promise<any[]> {
    try {
      // Make sure we have a session ID
      if (!this._sessionId) {
        this.initSession();
      }

      const response = await axiosInstance.get(`/api/chat/session/${this._sessionId}`);
      return response.data.data.messages || [];
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  },

  // Get all sessions for the current user (requires authentication)
  async getUserSessions(): Promise<any[]> {
    try {
      const response = await axiosInstance.get('/api/chat/user/sessions');
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

      await axiosInstance.delete(`/api/chat/session/${this._sessionId}`);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  },

  // Mock response generator for fallback when API is unavailable
  mockResponse(message: string, patentId?: string): Promise<ChatResponse> {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        let responseText = "I'm processing your question about this patent. Let me analyze the content and get back to you.";
        
        // Simple pattern matching for demo purposes
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
          responseText = `This patent (${patentId || 'US-8125463-B2'}) is about a multipoint touchscreen technology. It describes a touch panel with a transparent capacitive sensing medium that includes a first and second set of conductive traces with capacitive coupling nodes.`;
        }
        else if (lowerMessage.includes('keywords') || lowerMessage.includes('prior art')) {
          responseText = "Based on this patent, good keywords for prior art search might include: capacitive touchscreen, multi-touch, transparent conductive traces, mutual capacitance sensing, touch panel, touch sensor.";
        } 
        else if (lowerMessage.includes('novelty') || lowerMessage.includes('new') || lowerMessage.includes('innovative')) {
          responseText = "The novelty appears to be in the specific arrangement of the transparent capacitive sensing medium with two sets of conductive traces forming capacitive coupling nodes to precisely detect multiple touch points simultaneously.";
        }
        else if (lowerMessage.includes('inventor') || lowerMessage.includes('who')) {
          responseText = "The inventors of this patent are Strickon Joshua, Hotelling Steven Porter, and Huppi Brian Q.";
        }
        else if (lowerMessage.includes('when') || lowerMessage.includes('date')) {
          responseText = "This patent was granted on February 27, 2012, with a priority date of May 5, 2004.";
        }
        else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
          responseText = "Hello! I'm PB Assistant, your patent assistant. How can I help you analyze this patent?";
        }
        
        resolve({
          message: responseText,
          messageId: Date.now().toString(),
          sessionId: this._sessionId
        });
      }, 1000);
    });
  }
};

export default chatService; 