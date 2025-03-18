// ChatsList.tsx
import { useEffect, useState } from "react";
import { useUI } from "../contexts/UIContext";
import { fetchWithAuth } from "../api";

const ChatsList = () => {
  const [contacts, setContacts] = useState<{ 
    _id: string; 
    username: string;
    lastMessage?: string;
    timestamp?: string;
    unreadCount?: number;
    profilePic?: string;
  }[]>([]);
  
  const { displayChat } = useUI();
  
  useEffect(() => {
    const fetchContacts = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("You don't have the token in your localStorage");
        return;
      }
      
      try {
        const data = await fetchWithAuth("/chats/load");
        // Note: You'll need to modify your API to return additional data like lastMessage, timestamp, etc.
        setContacts(data);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };
    fetchContacts();
  }, []);
  
  return (
    <div className="chats-list-container">
      <div className="chats-list-header">
        <h2>Your Chats</h2>
      </div>
      {contacts.length === 0 ? (
        <div className="empty-chats">
          <div className="empty-state-icon">📭</div>
          <p>No chats yet</p>
        </div>
      ) : (
        <ul className="chats-list">
          {contacts.map((contact) => (
            <li 
              key={contact._id} 
              className="chat-item" 
              onClick={() => displayChat(contact._id)}
            >
              <div className="chat-avatar">
                {contact.profilePic ? (
                  <img src={contact.profilePic} alt={contact.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {contact.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="chat-info">
                <div className="chat-header-outside">
                  <span className="chat-name">{contact.username}</span>
                  <span className="chat-time">{contact.timestamp || "..."}</span>
                </div>
                <div className="chat-preview">
                  <p>{contact.lastMessage || "Start chatting..."}</p>
                  {contact.unreadCount && contact.unreadCount > 0 ? (
                    <span className="unread-count">{contact.unreadCount}</span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ ul>
      )}
    </div>
  );
};

export default ChatsList;

