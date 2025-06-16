import React, { useState, useEffect, useRef } from 'react';
import './EnhancedChatbot.scss';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { toast } from 'react-hot-toast';
import { useAutoScroll, getScrollStyles, getScrollClassName } from '../../hooks/useAutoScroll';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: Date;
  aiMatchSource: 'predefined' | 'textSearch' | 'aiGenerated' | 'fallback';
  feedback?: {
    helpful: boolean | null;
    comment?: string;
  };
}

interface QuickQuestion {
  id: string;
  question: string;
  category: string;
  icon: string;
}

const EnhancedChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);

  // Auto-scroll for chat messages
  const [chatRef, chatScrollState] = useAutoScroll({
    threshold: 300,
    maxHeight: '60vh',
    dependencies: [messages.length]
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Quick questions for common platform queries
  const quickQuestions: QuickQuestion[] = [
    {
      id: '1',
      question: 'What subscription plans are available?',
      category: 'subscription',
      icon: '💎'
    },
    {
      id: '2',
      question: 'How do I search for patents?',
      category: 'search',
      icon: '🔍'
    },
    {
      id: '3',
      question: 'What is Patent Analyzer?',
      category: 'features',
      icon: '🤖'
    },
    {
      id: '4',
      question: 'How to upload patent files?',
      category: 'upload',
      icon: '📁'
    },
    {
      id: '5',
      question: 'API key configuration help',
      category: 'settings',
      icon: '🔑'
    },
    {
      id: '6',
      question: 'Organization features explained',
      category: 'organization',
      icon: '🏢'
    }
  ];

  // Initialize session
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, []);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    setIsLoading(true);
    setShowQuickQuestions(false);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: messageText,
          sessionId: sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        const newMessage: ChatMessage = {
          id: data.data._id,
          message: messageText,
          response: data.data.response,
          timestamp: new Date(data.data.createdAt),
          aiMatchSource: data.data.aiMatchSource
        };

        setMessages(prev => [...prev, newMessage]);
        setCurrentMessage('');
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Error sending message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setCurrentMessage(question);
    sendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentMessage);
    }
  };

  const provideFeedback = async (messageId: string, helpful: boolean) => {
    try {
      await fetch(`/api/chat/feedback/${messageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ helpful })
      });

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedback: { helpful } }
          : msg
      ));

      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      predefined: { text: 'KB', color: '#22c55e', title: 'Knowledge Base' },
      textSearch: { text: 'DB', color: '#3b82f6', title: 'Database Search' },
      aiGenerated: { text: 'AI', color: '#7c4dff', title: 'AI Generated' },
      fallback: { text: 'FB', color: '#f59e0b', title: 'Fallback Response' }
    };
    
    const badge = badges[source as keyof typeof badges] || badges.fallback;
    
    return (
      <span 
        className="source-badge"
        style={{ backgroundColor: badge.color }}
        title={badge.title}
      >
        {badge.text}
      </span>
    );
  };

  return (
    <div className="enhanced-chatbot">
      <div className="chatbot-header">
        <div className="header-info">
          <h3>🤖 PatentsBrowser Assistant</h3>
          <p>Ask me anything about patents, subscriptions, or platform features!</p>
        </div>
        <div className="header-stats">
          <span className="session-id">Session: {sessionId.slice(-8)}</span>
        </div>
      </div>

      <div className="chatbot-content">
        {/* Quick Questions */}
        {showQuickQuestions && messages.length === 0 && (
          <div className="quick-questions">
            <h4>💡 Quick Questions</h4>
            <div className="questions-grid">
              {quickQuestions.map(q => (
                <button
                  key={q.id}
                  className="quick-question-btn"
                  onClick={() => handleQuickQuestion(q.question)}
                >
                  <span className="question-icon">{q.icon}</span>
                  <span className="question-text">{q.question}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div 
          ref={chatRef}
          className={getScrollClassName(chatScrollState, "chat-messages")}
          style={getScrollStyles(chatScrollState)}
        >
          {messages.map(msg => (
            <div key={msg.id} className="message-pair">
              {/* User Message */}
              <div className="message user-message">
                <div className="message-content">
                  <div className="message-text">{msg.message}</div>
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <div className="message-avatar user-avatar">👤</div>
              </div>

              {/* Bot Response */}
              <div className="message bot-message">
                <div className="message-avatar bot-avatar">🤖</div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="bot-name">PatentsBrowser Assistant</span>
                    {getSourceBadge(msg.aiMatchSource)}
                  </div>
                  <div className="message-text">{msg.response}</div>
                  <div className="message-actions">
                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="feedback-buttons">
                      <button
                        className={`feedback-btn ${msg.feedback?.helpful === true ? 'active' : ''}`}
                        onClick={() => provideFeedback(msg.id, true)}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        className={`feedback-btn ${msg.feedback?.helpful === false ? 'active' : ''}`}
                        onClick={() => provideFeedback(msg.id, false)}
                        title="Not helpful"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message bot-message loading">
              <div className="message-avatar bot-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="input-wrapper">
            <Input
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about patents, subscriptions, features..."
              disabled={isLoading}
            />
            <Button
              variant="primary"
              onClick={() => sendMessage(currentMessage)}
              disabled={isLoading || !currentMessage.trim()}
              className="send-button"
            >
              {isLoading ? '⏳' : '📤'}
            </Button>
          </div>
          <div className="input-hint">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatbot;
