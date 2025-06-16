import React, { useState, useEffect, useRef } from 'react';
import './FloatingChatbot.scss';
import { toast } from 'react-hot-toast';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: Date;
  isUser: boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFAQ, setShowFAQ] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Comprehensive FAQ data
  const faqData: FAQItem[] = [
    // Subscription & Pricing
    {
      id: '1',
      question: 'What subscription plans are available?',
      answer: `PatentsBrowser offers flexible subscription plans:

**Individual Plans:**
• Basic Plan (₹999/month) - Essential patent search and analysis
• Professional Plan (₹2,999/month) - Advanced features + AI analysis  
• Premium Plan (₹7,999/month) - Full access + priority support

**Organization Plans:**
• Team Plan (₹9,999/month) - Multi-user access + collaboration
• Enterprise Plan (₹19,999/month) - Advanced team features
• Corporate Plan (₹49,999/month) - Full enterprise suite

All plans include patent search, smart analysis, and workflow management.`,
      category: 'subscription'
    },
    {
      id: '2',
      question: 'How do I upgrade or change my subscription?',
      answer: `You can manage your subscription easily:

1. Go to Settings → Subscription
2. View available plans for your account type
3. Choose upgrade or plan stacking option
4. Complete payment via UPI or bank transfer

**Organization Features:**
• Admins can manage team subscriptions
• Invite team members to share benefits
• Centralized billing and user management`,
      category: 'subscription'
    },
    // Features & Tools
    {
      id: '3',
      question: 'What features does PatentsBrowser offer?',
      answer: `PatentsBrowser offers powerful patent research tools:

• **Patent Highlighter** - Complex search patterns in patents
• **Smart Search** - Auto-transforms patent IDs to proper format
• **Workflow Management** - Organize patents, avoid duplicates
• **AI Assistant** - Generate summaries and analysis reports
• **Batch Processing** - Upload files to extract multiple patent IDs
• **Patent Analyzer** - AI-powered relevance analysis
• **Team Collaboration** - Share research with team members`,
      category: 'features'
    },
    {
      id: '4',
      question: 'How does Patent Analyzer work?',
      answer: `Patent Analyzer uses AI to analyze patent relevance:

**Setup Process:**
1. Configure AI providers in Settings → API Keys
2. Create custom taxonomies (categories)
3. Upload patents (individual or bulk)
4. Choose analysis scope (title, abstract, claims, full text)
5. Run AI analysis using your configured provider
6. Get relevance scores and explanations
7. Export results to CSV

**Analysis Scopes:**
• Title + Abstract (recommended) - Fast and comprehensive
• Claims Only - Focused legal relevance
• Full Text - Most comprehensive analysis`,
      category: 'features'
    },
    // API & Configuration
    {
      id: '5',
      question: 'How do I configure AI API keys?',
      answer: `Configure AI providers in Settings → API Keys:

**Supported Providers:**
• Google AI (Gemini) - FREE tier with generous limits
• OpenAI (GPT-4) - PREMIUM quality analysis
• DeepSeek AI - COST-EFFECTIVE option
• Anthropic (Claude) - PREMIUM with safety features
• Cohere AI - ENTERPRISE multilingual capabilities
• Custom API - Your own OpenAI-compatible endpoint

**Setup Steps:**
1. Go to Settings → API Keys
2. Choose your preferred provider
3. Get API key from provider's website
4. Paste key and save (stored locally only)
5. Keys automatically work in Patent Analyzer

**Security:** All keys stored locally in browser only.`,
      category: 'settings'
    },
    // File Upload & Processing
    {
      id: '6',
      question: 'How to upload and process patent files?',
      answer: `PatentsBrowser supports bulk patent processing:

**Upload Process:**
1. Go to Upload Files section
2. Select documents containing patent references
3. System automatically extracts all patent IDs
4. Corrects and standardizes ID formats
5. Import directly into your workflow
6. Process hundreds of patents with one click

**Supported Formats:**
• PDF documents with patent references
• Text files with patent numbers
• Office actions and prior art documents
• Competitor analysis reports

**Benefits:**
• Saves hours of manual data entry
• Ensures accurate patent ID formatting
• Batch processing capabilities`,
      category: 'upload'
    },
    // Organization Features
    {
      id: '7',
      question: 'How do organization features work?',
      answer: `PatentsBrowser offers comprehensive team collaboration:

**Organization Admin Benefits:**
• Create organization during signup
• Access organization-specific plans
• Generate shareable invitation links
• Manage team permissions and access
• Centralized billing and subscription

**Team Collaboration:**
• Share subscription benefits with all members
• Collaborative patent research and analysis
• Shared workflows and saved patents
• Team-wide access to AI features

**Invitation System:**
• Share via email, WhatsApp, Telegram, Instagram
• Single-use secure invite links
• Automatic team member onboarding

Perfect for law firms, research teams, and corporate IP departments.`,
      category: 'organization'
    },
    // Search & Navigation
    {
      id: '8',
      question: 'How do I search for patents effectively?',
      answer: `PatentsBrowser offers multiple search methods:

**Smart Search Features:**
• Auto-corrects patent ID formats
• Supports US, EP, WO, and other formats
• Batch search capabilities
• Advanced filtering options

**Search Tips:**
• Use patent numbers: US20040105001, EP1234567
• Try different format variations
• Use bulk upload for multiple patents
• Apply filters for better results

**Workflow Integration:**
• Save interesting patents to folders
• Avoid duplicate reviews with smart tracking
• Export search results to CSV
• Share findings with team members`,
      category: 'search'
    }
  ];

  // Initialize session
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleFAQClick = (faq: FAQItem) => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      message: faq.question,
      response: '',
      timestamp: new Date(),
      isUser: true
    };

    const botMessage: ChatMessage = {
      id: `bot_${Date.now()}`,
      message: '',
      response: faq.answer,
      timestamp: new Date(),
      isUser: false
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setShowFAQ(false);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      message: currentMessage,
      response: '',
      timestamp: new Date(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setShowFAQ(false);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: currentMessage,
          sessionId: sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage: ChatMessage = {
          id: `bot_${Date.now()}`,
          message: '',
          response: data.data.response,
          timestamp: new Date(),
          isUser: false
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        toast.error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback to FAQ matching
      const matchedFAQ = faqData.find(faq => 
        faq.question.toLowerCase().includes(currentMessage.toLowerCase()) ||
        currentMessage.toLowerCase().includes(faq.question.toLowerCase().split(' ')[0])
      );

      const fallbackResponse = matchedFAQ ? matchedFAQ.answer : 
        "I'm here to help with PatentsBrowser questions. Try asking about subscription plans, features, or how to use specific tools.";

      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        message: '',
        response: fallbackResponse,
        timestamp: new Date(),
        isUser: false
      };

      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setShowFAQ(true);
    setCurrentMessage('');
  };

  return (
    <div className="floating-chatbot">
      {/* Chat Toggle Button */}
      <button 
        className={`chat-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Ask PB Assistant"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Widget */}
      {isOpen && (
        <div className="chat-widget">
          {/* Header */}
          <div className="chat-header">
            <div className="header-info">
              <div className="bot-avatar">🤖</div>
              <div className="header-text">
                <h4>Ask PB Assistant</h4>
                <span className="beta-badge">Beta</span>
              </div>
            </div>
            <div className="header-actions">
              <button onClick={resetChat} title="New Chat">🔄</button>
              <button onClick={() => setIsOpen(false)} title="Close">✕</button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <div className="bot-avatar">🤖</div>
                <div className="welcome-text">
                  Welcome back! How can I help you today?
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'bot'}`}>
                {!msg.isUser && <div className="message-avatar">🤖</div>}
                <div className="message-content">
                  <div className="message-text">
                    {msg.isUser ? msg.message : msg.response}
                  </div>
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.isUser && <div className="message-avatar user-avatar">👤</div>}
              </div>
            ))}

            {isLoading && (
              <div className="message bot loading">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* FAQ Section */}
          {showFAQ && messages.length === 0 && (
            <div className="faq-section">
              <div className="faq-title">Try asking:</div>
              <div className="faq-questions">
                {faqData.slice(0, 3).map(faq => (
                  <button
                    key={faq.id}
                    className="faq-question"
                    onClick={() => handleFAQClick(faq)}
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input">
            <input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading || !currentMessage.trim()}
              className="send-button"
            >
              📤
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatbot;
