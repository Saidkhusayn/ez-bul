// Sidebar.tsx
import React, {  } from "react";
import ChatsList from "./ChatsListing";
import Chat from "./Chat";
import { useUI } from "../contexts/UIContext";

const Sidebar: React.FC = () => {
  const { showContacts, chat } = useUI();
  const { sidebarOpen } = useUI();
  
  return (
    <div className={`sidebar-container ${sidebarOpen ? "open" : ""}`}>

      
      {/* Sidebar Content */}
      <div className="sidebar-content">
        {showContacts ? (
          <ChatsList />
        ) : chat.isVisible && chat.selectedReceiver ? (
          <Chat receiverId={chat.selectedReceiver} />
        ) : (
          <div className="no-chat-selected">
            <div className="empty-state-icon">💬</div>
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

