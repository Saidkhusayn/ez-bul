// src/contexts/UIContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

interface ChatState {
  isVisible: boolean;
  selectedReceiver: string | null;
}

interface UIContextType {
  showLogin: boolean;
  isLoggedIn: boolean;
  showContacts: boolean;
  chat: ChatState;
  setShowLogin: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  displayChat: (id: string) => void;
  closeChat: () => void;
  displayContacts: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showContacts, setShowContacts] = useState(true);
  const [chat, setChat] = useState<ChatState>({ isVisible: false, selectedReceiver: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // When a chat is selected, show the chat window and hide contacts
  const displayChat = (id: string) => {
    setChat({ isVisible: true, selectedReceiver: id });
    setShowContacts(false);
  };

  // Close the chat window and show contacts again.
  const closeChat = () => {
    setChat({ isVisible: false, selectedReceiver: null });
    setShowContacts(true);
  };

  const displayContacts = () => {
    setShowContacts(true);
    setChat({ isVisible: false, selectedReceiver: null });
  };

  useEffect(() => {
    const handleShowLoginModal = () => setShowLogin(true);
    window.addEventListener("showLoginModal", handleShowLoginModal);
    return () => window.removeEventListener("showLoginModal", handleShowLoginModal);
  }, []);

  return (
    <UIContext.Provider
      value={{
        showLogin,
        setShowLogin,
        isLoggedIn,
        setIsLoggedIn,
        showContacts,
        chat,
        displayChat,
        closeChat,
        displayContacts,
        sidebarOpen,
        toggleSidebar,  
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};
