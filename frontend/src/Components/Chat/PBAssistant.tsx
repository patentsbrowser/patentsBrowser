import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faQuestionCircle, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import './PBAssistant.scss';
import chatService from '../../services/chatService';
import { getModalState } from '../../utils/modalHelper';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
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
  "Help me to summarize this patent.",
  "What are some good keywords I can use to find prior art?",
  "What is the novelty of this patent?"
];

const PBAssistant: React.FC<PBAssistantProps> = ({ 
  patentId,
  patentTitle,
  patentAbstract,
  patentClaims,
  isOpen = false,
  onToggle
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(!isOpen);
  const [isSending, setIsSending] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isHidden, setIsHidden] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize chat with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: "Hello! I'm PB Assistant, your assistant for patent-related questions. How may I assist you today?",
          sender: 'assistant',
          timestamp: new Date()
        }
      ]);
      
      // Add context message if we have patent data
      if (patentId) {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: '2',
            content: "You can ask me any questions related to the content of the patent you're currently viewing. Whether it's about the inventor, claims, abstract, or any other specific section. Please note that I can only provide information and answer questions based on the content available on this page.",
            sender: 'assistant',
            timestamp: new Date()
          }
        ]);
      }
    }
  }, [patentId]);

  // Handle scroll to hide/show chat widget when scrolling
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current + 50) {
        setIsHidden(true);
        lastScrollY.current = currentScrollY;
      } else if (currentScrollY < lastScrollY.current - 50) {
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if modal is open
  useEffect(() => {
    const checkModalState = () => {
      const modalOpen = getModalState();
      if (modalOpen) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
    };

    // Check initially
    checkModalState();
    
    // Set up interval to check periodically
    const intervalId = setInterval(checkModalState, 500);
    
    return () => clearInterval(intervalId);
  }, []);

  // Sync with isOpen prop
  useEffect(() => {
    setIsCollapsed(!isOpen);
  }, [isOpen]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update message count
  useEffect(() => {
    setMessageCount(messages.filter(m => m.sender === 'user').length);
  }, [messages]);

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    if (onToggle) onToggle();
    
    // Focus input when expanded
    if (newCollapsedState === false) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
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

  const sendMessage = async (content: string) => {
    // Don't allow sending if we've reached the message limit
    if (messageCount >= 10) {
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
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="message assistant-message">
                <div className="assistant-icon">
                  <FontAwesomeIcon icon={faQuestionCircle} />
                </div>
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
          
          {messageCount === 0 && (
            <div className="suggested-questions">
              {defaultSuggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="suggestion-pill"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
          
          <div className="pb-assistant-input">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your question here."
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isSending || messageCount >= 10}
            />
            <button 
              className="send-button" 
              onClick={handleSendClick}
              disabled={!input.trim() || isSending || messageCount >= 10}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
          
          <div className="message-count">
            Message count: {messageCount}/10
          </div>
        </>
      )}
    </div>
  );
};

export default PBAssistant; 