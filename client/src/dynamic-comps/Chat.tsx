import React, { useState, useEffect, useRef } from "react";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext"; 
import { io } from "socket.io-client";
import { fetchWithAuth } from "../api";

interface ChatProps {
  receiverId: string;
}

const socket = io("http://localhost:3000", {
  transports: ["websocket"], 
  reconnectionAttempts: 5, 
  timeout: 5000, 
});

const Chat: React.FC<ChatProps> = ({ receiverId }) => {
  const { closeChat } = useUI();
  const { userId } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling
  
  const [messages, setMessages] = useState<{ text: string; isSender: boolean }[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState("User"); // Default name until fetched

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    socket.emit("join", userId); 

    socket.on("receiveMessage", (message) => {
      setMessages((prev) => [...prev, { text: message.text, isSender: false }]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [userId]);

  // Fetch receiver's username - comment this out if you'll handle this elsewhere
  /* 
  useEffect(() => {
    const fetchReceiverName = async () => {
      try {
        const userData = await fetchWithAuth(`/users/${receiverId}`);
        setReceiverName(userData.username || "User");
      } catch (error) {
        console.error("Error fetching receiver info:", error);
      }
    };
    fetchReceiverName();
  }, [receiverId]);
  */

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const messageText = formData.get("message") as string;

    if (messageText.trim()) {
      const newMessage = { text: messageText, isSender: true };
      setMessages((prev) => [...prev, newMessage]);

      socket.emit("sendMessage", {
        senderId: userId,
        receiverId,
        text: messageText,
      });
    }
    form.reset();
  };

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth(`/chats/history?receiverId=${receiverId}`);
      setMessages(data); 

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

  return (
    <div className="chat-container">
      {/* Chat header */}
      <div className="chat-header-inside">
        <div className="chat-header-info">
          <div className="chat-avatar">
            <div className="avatar-placeholder">
              {receiverName.charAt(0).toUpperCase()}
            </div>
          </div>
          <h3>{receiverName}</h3>
        </div>
        <button className="chat-close-btn" onClick={closeChat}>
          <span>×</span>
        </button>
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
                key={index} 
                className={`message ${msg.isSender ? 'message-sent' : 'message-received'}`}
              >
                <div className="message-bubble">
                  <p className="message-text">{msg.text}</p>
                  {/* You can add time here later: <span className="message-time">12:34</span> */}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input area */}
      <div className="chat-input">
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
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
