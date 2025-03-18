import React, { useState, useEffect } from "react";
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
  
  const [messages, setMessages] = useState<{ text: string; isSender: boolean }[]>([]); // State for messages
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

  useEffect(() => {
    socket.emit("join", userId); // Notify server of current user

    socket.on("receiveMessage", (message) => {
      setMessages((prev) => [...prev, { text: message.text, isSender: false }]);
    });

    return () => {
      socket.off("receiveMessage"); // Cleanup listener
    };
    
}, [userId]);


  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const messageText = formData.get("message") as string;

    if (messageText.trim()) {
      const newMessage = { text: messageText, isSender: true }; // Assuming the current user is the sender
      setMessages((prev) => [...prev, newMessage]);

      // Emit to Socket.io
      socket.emit("sendMessage", {
        senderId: userId,
        receiverId,
        text: messageText,
      });

    }
    form.reset();
  };

  const fetchChatHistory = async () => {
    //const token = localStorage.getItem("token");
    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth(`/chats/history?receiverId=${receiverId}`);

      console.log(data);
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
    <div className="chat-bar d-flex flex-column justify-content-between" style={{ height: "100%" }}>
      {/* Top Section: Header and Messages */}
      <div className="top-section">
        {/* Header Section */}
        <div className="header-section card-header d-flex justify-content-between">
          <h5>Chat with {receiverId}</h5>
          <button className="btn btn-close" onClick={closeChat}></button>
        </div>
        {/* Messages Section */}
        <div className="messages-section chat-messages flex-grow-1">
          {loading && <p>Loading chat history...</p>}
          {error && <p>{error}</p>}
          {!loading && !error && messages.length === 0 && <p>No messages yet.</p>}
          {!loading && !error && messages.map((msg, index) => (
            <div key={index} style={{ textAlign: msg.isSender ? "right" : "left" }}>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom Section: Typing Field */}
      <div className="bottom-section type-field">
        <form className="mb-2 d-flex" onSubmit={handleSend}>
          <input
            type="text"
            name="message"
            className="form-control form-control-sm flex-grow-1"
            placeholder="Type..."
            required
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
