import { useEffect, useState } from "react";
import { useUI } from "../contexts/UIContext";
import { fetchWithAuth } from "../api";
import { formatDistanceToNow } from "date-fns";

// Define proper types for our chat conversations
interface Conversation {
  _id: string;
  userId: string;
  username: string;
  name?: string;
  profilePicture?: string;
  lastMessage: {
    _id: string;
    text: string;
    senderId: string;
    timestamp: string;
    status: "sent" | "delivered" | "read";
    isSender: boolean;
  };
  unreadCount?: number;
}

const ChatsList = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { displayChat } = useUI();
  
  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        // Use the conversations endpoint from our fixed routes
        const data = await fetchWithAuth("/chats/conversations");
        setConversations(data);
        setError(null);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        setError("Failed to load chats. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
    
    // Optional: Set up a refresh interval
    const intervalId = setInterval(fetchConversations, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return "...";
    }
  };
  
  // Get message preview with truncation
  const getMessagePreview = (text: string) => {
    return text.length > 30 ? text.substring(0, 27) + "..." : text;
  };

  return (
    <div className="chats-list-container">
      <div className="chats-list-header">
        <h2>Your Chats</h2>
      </div>
      
      {loading ? (
        <div className="empty-chats">
          <span className="animate-pulse">Loading conversations...</span>
        </div>
      ) : error ? (
        <div className="empty-chats">
          <span className="text-red-500">{error}</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="empty-chats">
          <div className="empty-state-icon">📭</div>
          <p>No chats yet</p>
        </div>
      ) : (
        <ul className="chats-list">
          {conversations.map((convo) => (
            <li 
              key={convo.userId}
              onClick={() => displayChat(convo.userId)}
              className="chat-item"
            >
              <div className="chat-avatar">
                {convo.profilePicture ? (
                  <img 
                    src={convo.profilePicture} 
                    alt={convo.username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {(convo.name || convo.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="chat-info">
                <div className="chat-header-outside">
                  <span className="chat-name">{convo.name || convo.username}</span>
                  <span className="chat-time">
                    {formatTime(convo.lastMessage.timestamp)}
                  </span>
                </div>
                
                <div className="chat-preview">
                  <p>
                    {convo.lastMessage.isSender ? "You: " : ""}
                    {getMessagePreview(convo.lastMessage.text) || "Start chatting..."}
                  </p>
                  
                  {convo.unreadCount && convo.unreadCount > 0 ? (
                    <span className="unread-count">
                      {convo.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatsList;

