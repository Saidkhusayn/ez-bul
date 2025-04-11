import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext"; 
import { io } from "socket.io-client";
import { fetchWithAuth } from "../utilities/api";
import { format } from "date-fns";
import { Check, CheckCheck, CircleCheckBig, Pencil, Trash2, X, Send, Ellipsis } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL;

interface Message {
  _id: string;
  text: string; // This will be the decrypted message
  senderId: string;
  timestamp: string;
  edited: boolean;
  isSender: boolean;
  status?: "sent" | "delivered" | "read";
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
  //@ts-ignore fix that
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [messages, setMessages] = useState<Message[]>([]); 
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  
  const [receiverName, setReceiverName] = useState("User");
  const [receiverAvatar, setReceiverAvatar] = useState("");
  //const [lastSeen, setLastSeen] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false); //taste if it is working and how
  const [receiverIsTyping, setReceiverIsTyping] = useState(false);
  const [showActions, setShowActions] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, receiverIsTyping]);


  // Fetch unread message count more frequently --- look
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`/chats/unread-count/${receiverId}`);
      setUnreadCount(data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [receiverId]);

    // Handle socket connections
    useEffect(() => {
      socket.emit("join", userId);

    // Add this new listener for message creation confirmation
    socket.on("messageSent", ({ tempId, messageId, timestamp }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempId 
            ? { ...msg, _id: messageId, timestamp, status: "delivered" } 
            : msg
        )
      );
    });

    // Listen for incoming messages
    socket.on("receiveMessage", (message) => {
      if (message.senderId === receiverId) {
        setMessages((prev) => [...prev, { 
          ...message, 
          isSender: false 
        }]);
        
        // Mark received message as read immediately --- first go down and see if the user looked at the down messages (secondary)
        markMessageAsRead(message._id);
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

    // Listen for typing indicators
    socket.on("userTyping", ({ userId: typingUserId, isTyping }) => {
      if (typingUserId === receiverId) {
        setReceiverIsTyping(isTyping);
      }
    });

    // Listen for online users
    socket.on("userStatusChange", ({ userId: changedUserId, status }) => {
      if (changedUserId === receiverId) {
        setIsOnline(status === "online");
      }
    });
  
    socket.on("onlineUsers", (onlineUserIds: string[]) => {
      setIsOnline(onlineUserIds.includes(receiverId));
    });

    return () => {
      socket.off("messageSent");
      socket.off("receiveMessage");
      socket.off("messageUpdated");
      socket.off("messageDeleted");
      socket.off("messageStatus");
      socket.off("userTyping");
      socket.off("userStatusChange");
      socket.off("onlineUsers");
    };
  }, [userId, receiverId]);

  // Fetch receiver's info
  useEffect(() => {
    const fetchReceiverInfo = async () => {
      try {
        const userData = await fetchWithAuth(`/${receiverId}`);
        setReceiverName(userData.name || "User");
        setReceiverAvatar(userData.profilePicture || "");
        
        // Fetch unread count immediately
        fetchUnreadCount();
      } catch (error) {
        console.error("Error fetching receiver info:", error);
      }
    };
    
    fetchReceiverInfo();

    const unreadCountInterval = setInterval(fetchUnreadCount, 2000); // Every 2 seconds

    return () => {
      clearInterval(unreadCountInterval);
    };
  }, [receiverId]);

  useEffect(() => {
    socket.emit("getOnlineUsers");
  }, [receiverId]);
  
  // Mark messages as read
  const markMessageAsRead = (messageId: string) => { //only make them as read when he scrolls to them

    // Optimistic update to status
    setMessages(prev => 
      prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, status: "read" } 
          : msg
      )
    );
    
    // Emit socket event to mark message as read
    socket.emit("markAsRead", {
      messageIds: [messageId],
      receiverId: userId,
      senderId: receiverId
    });
    
    // Also call API to update server-side
    fetchWithAuth("/chats/mark-read", {
      method: "POST",
      //headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageIds: [messageId],
        senderId: receiverId
      })
    }).catch(err => {
      console.error("Error marking message as read:", err);
    });
  };

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
      
      //@ts-ignore    fix that
      setMessages((prev) => [...prev, newMessage]);

      // Send to server using your socket implementation
      socket.emit("sendMessage", {
        senderId: userId,
        receiverId,
        text: messageText,
        tempId,
        timestamp
      });
      
      // Stop typing indicator
      sendTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
  
  // Handle typing status userTyping
  const sendTypingStatus = (isTyping: boolean) => {
    if (socket) {
      socket.emit("typing", {
        senderId: userId,
        receiverId,
        isTyping
      });
    }
  };
  
  // Handle input changes with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Send typing indicator
    if (inputValue.length !== 0 && !isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    if (inputValue.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingStatus(false);
      }, 3000);
    } else {
      // No text, clear typing immediately
      setIsTyping(false);
      sendTypingStatus(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get messages from your API
      const data = await fetchWithAuth(`/chats/history/${receiverId}`);
      
      // Transform the data to include isSender flag
      const formattedMessages = data.map((msg: any) => ({
        ...msg,
        isSender: msg.senderId === userId
      }));
      
      setMessages(formattedMessages);
      
      // Mark unread received messages as read 
      const unreadMessageIds = formattedMessages
        .filter((msg: Message) => !msg.isSender && msg.status !== "read")
        .map((msg: Message) => msg._id);
      
      if (unreadMessageIds.length > 0) {
        // Mark as read via REST API
        await fetchWithAuth("/chats/mark-read", {
          method: "POST",
          body: JSON.stringify({
            messageIds: unreadMessageIds,
            senderId: receiverId
          })
        });
        
        // Also mark as read via socket for real-time updates
        socket.emit("markAsRead", {
          messageIds: unreadMessageIds,
          receiverId: userId,
          senderId: receiverId
        });
      }
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
  const formatMessageDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
  
      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else if (date.getFullYear() === today.getFullYear()) {
        return format(date, "MMM d"); 
      } else {
        return format(date, "MMM d, yyy"); 
      }
    } catch (error) {
      return "Unknown Date";
    }
  };
  
  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, "HH:mm"); // Example: 15:41
    } catch (error) {
      return "Just now";
    }
  };

// Create a memoized component for the status icon
const MessageStatusIcon = React.memo(({ status }: { status?: string }) => {
  const getStatusIcon = React.useMemo(() => {
    switch (status) {
      case "sent":
        return <Check size={14} className="text-gray-400" />;
      case "delivered":
        return (
          <div className="double-check">
            <CircleCheckBig size={14} className="text-gray-400" />
          </div>
        );
      case "read":
        return <CheckCheck size={14} className="text-blue-500" />;
      default:
        return null;
    }
  }, [status]);

  return (
    <span className="message-span">
      {getStatusIcon}
    </span>
  );
});

  // Function to determine if we should show a date header
  const shouldShowDateHeader = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) {
      return true;
    }

    const currentDate = new Date(currentMessage.timestamp).toDateString();
    const previousDate = new Date(previousMessage.timestamp).toDateString();
    return currentDate !== previousDate;
  };

  // Group messages by date for rendering 
  const renderMessagesWithDateHeaders = () => {

    return messages.map((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const showDateHeader = shouldShowDateHeader(message, previousMessage);

      return (
        <React.Fragment key={message._id}>
          {showDateHeader && (
            <div className="date-header">
              <div className="date-divider">
                <span className="date-text small">{formatMessageDate(message.timestamp)}</span>
              </div>
            </div>
          )}
          <div 
            className={`message ${message.isSender ? 'message-sent' : 'message-received'}`}
          >
            <div className="message-bubble position-relative">
              <p className="message-text">{message.text}</p>
              <div>
                <div>
                  <span className="ellipsis-icon d-flex justify-content-end">
                    <Ellipsis size={15} onClick={
                      () => {setShowActions(true)} //make reusable function to make the box disappear when the outside of it is clicked
                    }/>
                  </span>               
                </div>
                {showActions && message.isSender && (
                  <ul className="dropdown-list">
                    <li 
                      className="dropdown-item" 
                      onClick={() => handleEdit(message._id, message.text)}
                      aria-label="Edit message"
                    >
                      <Pencil size={13} />
                    </li>
                    <li 
                      className="dropdown-item" 
                      onClick={() => handleDelete(message._id)}
                      aria-label="Delete message"
                    >
                      <Trash2 size={13}/>
                    </li>
                  </ul>
                )}
                <div>
                  <div className="message-info d-flex align-items-end justify-content-end gap-1">
                    {message.edited && <span className="message-span">edited</span>}
                    <span className="message-span">
                      {formatMessageTime(message.timestamp)} 
                    </span>
                    {message.isSender && (
                      <span className="message-span">
                         <MessageStatusIcon status={message.status} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <div className="chat-container">
      {/* Chat header */}
      <div className="chat-header-inside">
        <div className="chat-header-info">
          <div className="chat-avatar">
            <div className="chat-avatar__container">
              {receiverAvatar ? (
                <div className="chat-avatar__image-wrapper">
                  <img 
                  src={receiverAvatar} 
                  alt={`${receiverName}'s avatar`} 
                  className="avatar-image" 
                  />
                </div>
              ) : (
                <div className="avatar-placeholder">
                  {receiverName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOnline && <span className="status-indicator online"></span>}
          </div>
          <div className="user-info">
            <h5>{receiverName}</h5>
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
            {renderMessagesWithDateHeaders()}
            
            {/* Typing indicator */}
            {receiverIsTyping && (
              <div className="typing-indicator">
                <div className="typing-bubble">
                  <span className="typing-dot">.</span>
                  <span className="typing-dot">.</span>
                  <span className="typing-dot">.</span>
                </div>
              </div>
            )}
          
            <div ref={messagesEndRef}/>
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
                onChange={handleInputChange}
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