import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faQuestionCircle, faChevronDown, faChevronUp, faThumbsUp, faThumbsDown } from '@fortawesome/free-solid-svg-icons';
import './PBAssistant.scss';
import chatService from '../../services/chatService';
import { getModalState } from '../../utils/modalHelper';
import { useAuth } from '../../AuthContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  feedback?: 'positive' | 'negative' | null;
}

interface PBAssistantProps {
  patentId?: string;
  patentTitle?: string;
  patentAbstract?: string;
  patentClaims?: any[];
  isOpen?: boolean;
  onToggle?: () => void;
}

const defaultSuggestions = [
  "What features does PatentsBrowser offer?",
  "How does the Patent Highlighter work?",
  "Tell me about Smart Search for patent IDs"
];

// When viewing a patent, offer patent-specific suggestions
const getContextualSuggestions = (patentId?: string) => {
  if (patentId) {
    return [
      "Help me to summarize this patent.",
      "What are some good keywords I can use to find prior art?",
      "What is the novelty of this patent?"
    ];
  }
  return defaultSuggestions;
};

const PBAssistant: React.FC<PBAssistantProps> = ({ 
  patentId,
  patentTitle,
  patentAbstract,
  patentClaims,
  isOpen = false,
  onToggle
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(!isOpen);
  const [isSending, setIsSending] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isHidden, setIsHidden] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [feedbackInProgress, setFeedbackInProgress] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize chat session and load history when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      // Initialize chat session
      const sid = chatService.initSession();
      setSessionId(sid);
      
      try {
        // Try to load previous messages for this session
        const sessionMessages = await chatService.getSessionMessages();
        
        if (sessionMessages && sessionMessages.length > 0) {
          // Format backend messages to match our frontend format
          const formattedMessages = sessionMessages.map(msg => ({
            id: msg._id,
            content: msg.sender === 'user' ? msg.message : msg.response,
            sender: msg.sender === 'user' ? 'user' : 'assistant',
            timestamp: new Date(msg.createdAt),
            feedback: msg.feedback?.helpful === true ? 'positive' : 
                      msg.feedback?.helpful === false ? 'negative' : null
          }));
          
          setMessages(formattedMessages);
          setMessageCount(formattedMessages.length);
        } else {
          // If no previous messages, add welcome message
          addWelcomeMessage();
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Fall back to welcome message
        addWelcomeMessage();
      }
    };
    
    initializeChat();
  }, [user, patentId]);

  // Add welcome messages based on context
  const addWelcomeMessage = () => {
    const welcomeMessages: Message[] = [
      {
        id: '1',
        content: chatService.getWelcomeMessage(),
        sender: 'assistant',
        timestamp: new Date()
      }
    ];
    
    // Add context message if we have patent data
    if (patentId) {
      welcomeMessages.push({
        id: '2',
        content: "You can ask me any questions related to the content of the patent you're currently viewing. Whether it's about the inventor, claims, abstract, or any other specific section. Please note that I can only provide information and answer questions based on the content available on this page.",
        sender: 'assistant',
        timestamp: new Date()
      });
    }
    
    setMessages(welcomeMessages);
    setMessageCount(welcomeMessages.length);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isCollapsed]);

  // Handle auto-hiding chat when scrolling
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollDelta = scrollY - lastScrollY.current;
      
      if (scrollDelta > 50 && !isCollapsed) {
        setIsHidden(true);
      } else if (scrollDelta < -50 && isHidden) {
        setIsHidden(false);
      }
      
      lastScrollY.current = scrollY;
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCollapsed, isHidden]);

  // Auto-hide chat when modal opens
  useEffect(() => {
    const checkModalState = () => {
      const modalOpen = getModalState();
      if (modalOpen) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
    };
    
    // Check initially and then set up an interval
    checkModalState();
    const intervalId = setInterval(checkModalState, 500);
    
    return () => clearInterval(intervalId);
  }, []);

  // Update component when isOpen prop changes
  useEffect(() => {
    setIsCollapsed(!isOpen);
    if (isOpen) {
      setIsHidden(false);
    }
  }, [isOpen]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
    if (onToggle) {
      onToggle();
    }
  };

  const focusInput = () => {
    if (!isCollapsed) {
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      sendMessage(input);
    }
  };

  const handleSendClick = () => {
    if (input.trim()) {
      sendMessage(input);
    }
  };

  const handleFeedback = async (messageId: string, isHelpful: boolean) => {
    // Prevent multiple feedback submissions for the same message
    if (feedbackInProgress === messageId) return;
    
    setFeedbackInProgress(messageId);
    
    // Update UI immediately for better user experience
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedback: isHelpful ? 'positive' : 'negative' } 
          : msg
      )
    );
    
    try {
      // Send feedback to backend
      await chatService.submitFeedback(messageId, { 
        helpful: isHelpful 
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // No need to revert UI as the user already sees their selection
    } finally {
      setFeedbackInProgress(null);
    }
  };

  const sendMessage = async (content: string) => {
    // Don't allow sending if we've reached the message limit
    if (messageCount >= 10) {
      toast.error('You have reached the message limit for this session');
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsSending(true);
    setMessageCount(prev => prev + 1);

    try {
      // Call the chat service to get a response
      const response = await chatService.sendMessage(content, patentId);
      
      const assistantResponse: Message = {
        id: response.messageId,
        content: response.message,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prevMessages => [...prevMessages, assistantResponse]);
      setMessageCount(prev => prev + 1);
    } catch (error) {
      // Handle error - add an error message to the chat
      console.error('Error getting chat response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error processing your request. Please try again later.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // Use the appropriate suggestions based on context
  const currentSuggestions = getContextualSuggestions(patentId);

  // If hidden by scroll or modal, don't render
  if (isHidden && isCollapsed) {
    return null;
  }

  return (
    <div 
      ref={chatContainerRef}
      className={`pb-assistant-container ${isCollapsed ? 'collapsed' : ''} ${isHidden ? 'hidden' : ''}`}
    >
      <div className="pb-assistant-header" onClick={toggleCollapse}>
        <div className="header-left">
          <div className="assistant-avatar">
            <FontAwesomeIcon icon={faQuestionCircle} />
          </div>
          <h3>Ask PB Assistant</h3>
          <div className="beta-badge">Beta</div>
        </div>
        <div className="header-right">
          <FontAwesomeIcon icon={isCollapsed ? faChevronUp : faChevronDown} />
        </div>
      </div>
      
      {!isCollapsed && (
        <>
          <div className="pb-assistant-messages">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                {message.sender === 'assistant' && (
                  <div className="assistant-icon">
                    <FontAwesomeIcon icon={faQuestionCircle} />
                  </div>
                )}
                <div className="message-content">
                  {message.content.includes('•') || message.content.includes('\n') ? (
                    <div 
                      className="formatted-message"
                      dangerouslySetInnerHTML={{ 
                        __html: message.content
                          .replace(/\n/g, '<br>')
                          .replace(/•/g, '<span class="bullet">•</span>')
                          .replace(/\d\)(.*?)(?=\n|\d\)|$)/g, '<div class="feature-item">$&</div>')
                      }}
                    />
                  ) : (
                    <p dangerouslySetInnerHTML={{ __html: message.content }}></p>
                  )}
                  
                  {message.sender === 'assistant' && message.id !== '1' && message.id !== '2' && (
                    <div className="message-feedback">
                      {message.feedback ? (
                        <div className="feedback-submitted">
                          {message.feedback === 'positive' ? 'Thanks for the positive feedback!' : 'Thanks for your feedback'}
                        </div>
                      ) : (
                        <>
                          <span className="feedback-prompt">Was this helpful?</span>
                          <button 
                            className={`feedback-btn positive ${feedbackInProgress === message.id ? 'disabled' : ''}`}
                            onClick={() => handleFeedback(message.id, true)}
                            disabled={feedbackInProgress === message.id}
                          >
                            <FontAwesomeIcon icon={faThumbsUp} />
                          </button>
                          <button 
                            className={`feedback-btn negative ${feedbackInProgress === message.id ? 'disabled' : ''}`}
                            onClick={() => handleFeedback(message.id, false)}
                            disabled={feedbackInProgress === message.id}
                          >
                            <FontAwesomeIcon icon={faThumbsDown} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="message assistant-message">
                <div className="assistant-icon">
                  <FontAwesomeIcon icon={faQuestionCircle} />
                </div>
                <div className="message-content typing-container">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p className="typing-text">PB Assistant is thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {messageCount < 10 ? (
            <>
              <div className="pb-assistant-input" onClick={focusInput}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button className="send-button" onClick={handleSendClick}>
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </div>
              
              {messages.length <= 2 && (
                <div className="suggested-questions">
                  <p>Try asking:</p>
                  <div className="suggestions">
                    {currentSuggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className="suggestion"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="message-limit-warning">
              <p>You've reached the maximum number of messages for this session. To continue, please start a new conversation.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PBAssistant; 