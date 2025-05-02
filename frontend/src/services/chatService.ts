import axios from 'axios';
import { API_URL } from '../config';

interface ChatMessage {
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  messageId: string;
}

// This service is responsible for handling chat interactions with the backend
export const chatService = {
  // Send a message to the AI and get a response
  async sendMessage(
    message: string, 
    patentId?: string
  ): Promise<ChatResponse> {
    try {
      // In a real implementation, this would call the backend API
      // const response = await axios.post(`${API_URL}/chat`, {
      //   message,
      //   patentId,
      //   timestamp: new Date().toISOString()
      // });
      // return response.data;
      
      // For now, we'll mock the response with a simple function
      return this.mockResponse(message, patentId);
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  },

  // Mock response generator for demonstration purposes
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
          messageId: Date.now().toString()
        });
      }, 1000);
    });
  }
};

export default chatService; 