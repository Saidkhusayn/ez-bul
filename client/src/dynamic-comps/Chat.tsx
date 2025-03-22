import React, { useState, useEffect, useRef } from "react";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext"; 
import { io } from "socket.io-client";
import { fetchWithAuth } from "../api";
import { format } from "date-fns";
import { Check, CheckCheck, Edit, Trash2, X, Send, Ellipsis } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL;

interface Message {
  _id: string;
  text: string; // This will be the decrypted message
  senderId: string;
  timestamp: string;
  edited: boolean;
  isSender: boolean;
  status?: "sent" | "delivered" | "read"; //remove the delivered
}

interface ChatProps {
  receiverId: string;
}

// Create a singleton socket connection
const socket = io(API_URL, {
  transports: ["websocket"], 
  reconnectionAttempts: 5, 
  timeout: 5000, 
});

const Chat: React.FC<ChatProps> = ({ receiverId }) => {
  const { closeChat } = useUI();
  const { userId } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]); 
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  
  const [receiverName, setReceiverName] = useState("User");
  const [receiverAvatar, setReceiverAvatar] = useState("");
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle socket connections
  useEffect(() => {
    socket.emit("join", userId);

    // Listen for incoming messages
    socket.on("receiveMessage", (message) => {
      if (message.senderId === receiverId) {
        setMessages((prev) => [...prev, { 
          ...message, 
          isSender: false 
        }]);
      }
    });

    // Listen for message updates
    socket.on("messageUpdated", (updatedMessage) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === updatedMessage._id 
            ? { ...updatedMessage, isSender: msg.isSender } 
            : msg
        )
      );
    });

    // Listen for message deletions
    socket.on("messageDeleted", (messageId) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

    // Listen for message status updates
    socket.on("messageStatus", ({ messageId, status }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, status } 
            : msg
        )
      );
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("messageUpdated");
      socket.off("messageDeleted");
      socket.off("messageStatus");
    };
  }, [userId, receiverId]);

  // Fetch receiver's info
  useEffect(() => {
    const fetchReceiverInfo = async () => {
      try {
        const userData = await fetchWithAuth(`/${receiverId}`);
        setReceiverName(userData.name || "User");
        setReceiverAvatar(userData.profilePicture || "");
        
        // If you implement online status tracking, set these values
         setIsOnline(userData.isOnline || false);
         setLastSeen(userData.lastSeen || null);
      } catch (error) {
        console.error("Error fetching receiver info:", error);
      }
    };
    
    fetchReceiverInfo();
  }, [receiverId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const messageText = formData.get("message") as string;

    if (messageText.trim()) {
      const timestamp = new Date().toISOString();
      
      // Optimistically update UI
      const tempId = `temp-${Date.now()}`;
      const newMessage = { 
        _id: tempId,
        text: messageText, 
        senderId: userId,
        timestamp,
        edited: false,
        isSender: true,
        status: "sent" as const
      };
      //@ts-ignore //loooook
      setMessages((prev) => [...prev, newMessage]);

      // Send to server using your socket implementation
      socket.emit("sendMessage", {
        senderId: userId,
        receiverId,
        text: messageText,
        timestamp
      });
    }
    form.reset();
  };

  const handleEdit = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditText(currentText);
    
    // Focus the input field after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editText.trim() && editingMessageId) {
      // Optimistically update UI
      setMessages(prev => 
        prev.map(msg => 
          msg._id === editingMessageId 
            ? { ...msg, text: editText, edited: true } 
            : msg
        )
      );

      // Send to server
      socket.emit("updateMessage", {
        messageId: editingMessageId,
        text: editText,
        senderId: userId,
        receiverId
      });

      // Reset editing state
      setEditingMessageId(null);
      setEditText("");
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleDelete = (messageId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      // Optimistically update UI
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      // Send to server
      socket.emit("deleteMessage", {
        messageId,
        senderId: userId,
        receiverId
      });
    }
  };

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get decrypted messages from your API
      const data = await fetchWithAuth(`/chats/history/${receiverId}`);
      
      // Transform the data to include isSender flag
      const formattedMessages = data.map((msg: any) => ({
        ...msg,
        isSender: msg.senderId === userId
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setError("Error fetching chat history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [receiverId]);

  // Format timestamp into readable format
  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return format(date, 'HH:mm'); // Today: 3:42 PM
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${format(date, 'HH:mm')}`; // Yesterday, 3:42 PM
      } else {
        return format(date, 'MMM d, HH:mm'); // Jan 5, 3:42 PM
      }
    } catch (error) {
      return 'Just now';
    }
  };

  // Get message status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "sent":
        return <Check size={14} className="text-gray-400" />;
      case "delivered":
        return <div className="double-check">
          <Check size={14} className="text-gray-400" style={{ marginRight: '-4px' }} />
          <Check size={14} className="text-gray-400" />
        </div>;
      case "read":
        return <CheckCheck size={14} className="text-blue-500" />;
      default:
        return "";
    }
  };

  return (
<div className="chat-container">
      {/* Chat header */}
      <div className="chat-header-inside">
        <div className="chat-header-info">
          <div className="chat-avatar">
            {receiverAvatar ? (
              <img 
                src={receiverAvatar} 
                alt={`${receiverName}'s avatar`} 
                className="avatar-image" 
              />
            ) : (
              <div className="avatar-placeholder">
                {receiverName.charAt(0).toUpperCase()}
              </div>
            )}
            {isOnline && <span className="status-indicator online"></span>}
          </div>
          <div className="user-info">
            <h3>{receiverName}</h3>
            {isOnline && <span className="status-text">Online</span>}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-close-btn" onClick={closeChat}>
            <span>×</span>
          </button>
        </div>
      </div>
      
      {/* Messages area */}
      <div className="chat-messages">
        {loading && (
          <div className="chat-loading">
            <div className="loading-spinner"></div>
            <p>Loading messages...</p>
          </div>
        )}
        
        {error && (
          <div className="chat-error">
            <p>{error}</p>
            <button 
              className="retry-btn"
              onClick={fetchChatHistory}
            >
              Retry
            </button>
          </div>
        )}
        
        {!loading && !error && messages.length === 0 && (
          <div className="no-messages">
            <div className="empty-state-icon">📨</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        
        {!loading && !error && messages.length > 0 && (
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div 
                key={msg._id} 
                className={`message ${msg.isSender ? 'message-sent' : 'message-received'}`}
              >
                <div className="message-bubble">
                  <p className="message-text">{msg.text}</p>

                  <div>
                    <div>
                      <span className="ellipsis-icon d-flex justify-content-end">
                        <Ellipsis size={15} />
                      </span>               
                    </div>

                    <div>
                      <div className="message-info d-flex align-items-end justify-content-end gap-1">
                        {msg.edited && <span className="message-span">edited</span>}
                        <span className="message-span ">
                          {formatMessageTime(msg.timestamp)} 
                        </span>
                        {msg.isSender && (
                          <span className="message-span">
                            {getStatusIcon(msg.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
            
                {
                  //paste here
                }
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input area */}
      <div className="chat-input">
        {editingMessageId ? (
          <form onSubmit={submitEdit} className="edit-form">
            <div className="edit-container">
              <div className="edit-label">Editing message</div>
              <div className="input-container">
                <input
                  ref={inputRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="edit-input"
                  autoComplete="off"
                  required
                />
                <div className="edit-actions">
                  <button type="button" className="cancel-btn" onClick={cancelEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSend}>
            <div className="input-container">
              <input
                type="text"
                name="message"
                placeholder="Type a message..."
                autoComplete="off"
                required
              />
              <button type="submit" className="send-button">
                <Send />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
