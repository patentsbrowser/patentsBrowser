import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import PBAssistant from '../Components/Chat/PBAssistant';
import { getModalState } from '../utils/modalHelper';

interface ChatContextType {
  isChatOpen: boolean;
  toggleChat: () => void;
  hideChat: () => void;
  showChat: () => void;
  setPatentInfo: (info: PatentInfo) => void;
}

interface PatentInfo {
  patentId?: string;
  patentTitle?: string;
  patentAbstract?: string;
  patentClaims?: any[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [patentInfo, setPatentInfo] = useState<PatentInfo>({});

  const toggleChat = () => setIsChatOpen(prev => !prev);
  const hideChat = () => setIsChatOpen(false);
  const showChat = () => setIsChatOpen(true);

  const updatePatentInfo = (info: PatentInfo) => {
    setPatentInfo(prev => ({ ...prev, ...info }));
  };

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        toggleChat,
        hideChat,
        showChat,
        setPatentInfo: updatePatentInfo,
      }}
    >
      {children}
      <PBAssistant
        patentId={patentInfo.patentId}
        patentTitle={patentInfo.patentTitle}
        patentAbstract={patentInfo.patentAbstract}
        patentClaims={patentInfo.patentClaims}
        isOpen={isChatOpen}
        onToggle={toggleChat}
      />
    </ChatContext.Provider>
  );
};

export default ChatProvider; 