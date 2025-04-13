import { useEffect, useState } from "react";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";
import { fetchWithAuth } from "../utilities/api";
import { formatDistanceToNow } from "date-fns";
import { io } from "socket.io-client";
import { Inbox } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL;


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
  unreadCount: number;
  isOnline: boolean;
}

 // Create a singleton socket connection
 const socket = io(API_URL, {
  transports: ["websocket"], 
  reconnectionAttempts: 5, 
  timeout: 5000, 
});

const ChatsList = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const { displayChat } = useUI();
  const { userId } = useAuth();
  
  // Fetch conversations with unread counts
  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Fetch conversations
      const conversationsData = await fetchWithAuth("/chats/conversations");
      
      // Fetch unread counts for each conversation
      const conversationsWithCounts = await Promise.all(
        conversationsData.map(async (convo: any) => {
          // Only fetch unread count if the last message is not from the current user
          if (!convo.lastMessage.isSender) {
            const { count } = await fetchWithAuth(`/chats/unread-count/${convo.userId}`);
            return { ...convo, unreadCount: count, isOnline: onlineUsers.includes(convo.userId) };
          }
          return { ...convo, unreadCount: 0, isOnline: onlineUsers.includes(convo.userId) };
        })
      );
      
      setConversations(conversationsWithCounts);
      setError(null);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("Failed to load chats. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchConversations();
  }, [onlineUsers]);
  
  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.emit("join", userId);
    
    // Listen for online users
    socket.on("onlineUsers", (users: string[]) => {
      setOnlineUsers(users);
    });
    
    // Request online users list
    socket.emit("getOnlineUsers");
    
    // Listen for user status changes
    socket.on("userStatusChange", ({ userId, status }: { userId: string, status: string }) => {
      setOnlineUsers(prev => {
        if (status === "online" && !prev.includes(userId)) {
          return [...prev, userId];
        } else if (status === "offline") {
          return prev.filter(id => id !== userId);
        }
        return prev;
      });
    });
    
    // Listen for new messages to update unread counts
    socket.on("receiveMessage", (message) => {
      console.log('message is received');
      
      // First update existing conversations
      setConversations(prevConversations => {
        // Check if this sender already exists in conversations
        const existingConvoIndex = prevConversations.findIndex(
          convo => convo.userId === message.senderId
        );
        
        // If conversation exists, update it
        if (existingConvoIndex >= 0) {
          const updatedConversations = [...prevConversations];
          const convo = updatedConversations[existingConvoIndex];
          
          // Update with new message and increment unread count
          updatedConversations[existingConvoIndex] = {
            ...convo,
            lastMessage: {
              _id: message._id,
              text: message.text,
              senderId: message.senderId,
              timestamp: message.timestamp || new Date().toISOString(),
              status: message.status || "delivered",
              isSender: false
            },
            unreadCount: convo.unreadCount + 1
          };
          
          // Move this conversation to the top (most recent)
          if (existingConvoIndex > 0) {
            const movedConvo = updatedConversations.splice(existingConvoIndex, 1)[0];
            updatedConversations.unshift(movedConvo);
          }
          
          return updatedConversations;
        } else {
          // If this is a completely new conversation, fetch fresh data
          // This is more reliable than trying to construct a new conversation object
          fetchConversations();
          return prevConversations;
        }
      });
    });
    
    // Listen for message status updates
    socket.on("messageStatus", ({ messageId, status }) => {
      if (status === "read") {
        // Update the conversation with this message
        setConversations(prevConversations => 
          prevConversations.map(convo => {
            if (convo.lastMessage._id === messageId) {
              return {
                ...convo,
                lastMessage: {
                  ...convo.lastMessage,
                  status
                }
              };
            }
            return convo;
          })
        );
      }
    });
    
    return () => {
      socket.off("onlineUsers");
      socket.off("userStatusChange");
      socket.off("receiveMessage");
      socket.off("messageStatus");
    };
  }, [socket]);
  
  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp));
    } catch (e) {
      return '...';
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
         <div className="empty-state-icon"> < Inbox size={45} strokeWidth={1.2} /> </div>
          <p>No chats yet</p>
        </div>
      ) : (
        <ul className="chats-list">
          {conversations.map((convo) => (
            <li 
              key={convo.userId}
              onClick={() => displayChat(convo.userId)}
              className="chat-item position-relative"
            >
              <div className="chat-avatar">
               
                  {convo.profilePicture ? (     
                      <img 
                        src={convo.profilePicture} 
                        alt={convo.username} 
                      />                     
                  ) : (
                    <div className="avatar-placeholder">
                      {(convo.name || convo.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                
                {convo.isOnline && (
                  <span className="status-indicator online"></span>
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
                  
                  {convo.unreadCount > 0 && (
                    <span className="unread-count">
                      {convo.unreadCount}
                    </span>
                  )}
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

