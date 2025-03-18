// Sidebar.tsx
import React, { useState } from "react";
import ChatsList from "../dynamic-comps/ChatsList";
import Chat from "../dynamic-comps/Chat";
import { useUI } from "../contexts/UIContext";

const Sidebar: React.FC = () => {
  const { showContacts, chat } = useUI();
  const [isOpen, setIsOpen] = useState(false); 

  return (
    <div className={`sidebar-container ${isOpen ? "open" : ""}`}>
      {/* Toggle button */}
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close" : "Chat"} 
      </button>

      {/* Sidebar Content */}
      <div className="sidebar-content">
        {showContacts ? (
          <ChatsList />
        ) : chat.isVisible && chat.selectedReceiver ? (
          <Chat receiverId={chat.selectedReceiver} />
        ) : (
          <p>Select a chat to start messaging</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

