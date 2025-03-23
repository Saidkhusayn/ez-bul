const socketIO = require("socket.io");
const MessageModel = require("../models/Message");
const UserModel = require("../models/Users")
const { encrypt, decrypt } = require("../utils/encrypt");

const setupSocket = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    const users = new Map(); 
    io.users = users; 

    io.on("connection", (socket) => {
        //console.log("New client connected:", socket.id);
        let currentUserId = null;

        socket.on("join", (userId) => {
            if (!userId) {
                return socket.emit("error", { message: "Invalid user ID" });
            }
            
            currentUserId = userId; 
            users.set(userId, socket.id);
            console.log(`User ${userId} connected with socket ID: ${socket.id}`);
            socket.emit("joined", { success: true });
            
            // Broadcast to all clients that this user is online
            io.emit("userStatusChange", {
                userId,
                status: "online"
            });
        });

        // Handle client requesting list of online users
        socket.on("getOnlineUsers", () => {
            socket.emit("onlineUsers", Array.from(users.keys()));
        });

        // Handle user status updates (away, online, etc.)
        socket.on("updateStatus", ({ status }) => {
            if (currentUserId) {
                io.emit("userStatusChange", {
                    userId: currentUserId,
                    status
                });
            }
        });

        // Handle sending a message
        socket.on("sendMessage", async ({ senderId, receiverId, text, tempId, timestamp }) => {
            try {
                // Existing code...
                if (!senderId || !receiverId || !text) {
                    return socket.emit("messageError", { 
                        error: "Missing required fields", 
                        tempId 
                    });
                }
                
                console.log(`Message from ${senderId} to ${receiverId}`);
                
                // Encrypt the message before saving
                const encryptedText = encrypt(text);
                
                // Save encrypted message to MongoDB
                const newMessage = new MessageModel({
                    senderId,
                    receiverId,
                    encMessage: encryptedText,
                    createdAt: timestamp || new Date(),
                    status: "sent",
                    edited: false
                });

                await newMessage.save();

                const messageData = {
                    _id: newMessage._id,
                    text, // Send original text, not encrypted
                    senderId,
                    timestamp: newMessage.createdAt,
                    status: "sent",
                    edited: false
                };

                // Emit the message to the receiver if they're online
                const receiverSocket = users.get(receiverId);
                if (receiverSocket) {
                    io.to(receiverSocket).emit("receiveMessage", { //use the receiveMessage for somekind of action like notification
                        ...messageData,
                        status: "delivered" 
                    });
                    
                    // Update message status to delivered in the database
                    await MessageModel.findByIdAndUpdate(newMessage._id, { status: "delivered" });
                    
                    // Notify sender that message was delivered
                    socket.emit("messageStatus", {
                        messageId: newMessage._id,
                        status: "delivered",
                        tempId
                    });
                }
                
                // Send the message ID back to the sender for reference
                socket.emit("messageSent", {
                    tempId,
                    messageId: newMessage._id,
                    timestamp: newMessage.createdAt
                });
            } catch (error) {
                console.error("Error saving message:", error);
                socket.emit("messageError", { 
                    error: "Failed to send message", 
                    tempId 
                });
            }
        });

        // Handle updating a message
        socket.on("updateMessage", async ({ messageId, text, senderId, receiverId }) => {
            try {
                if (!messageId || !text || !senderId || !receiverId) {
                    return socket.emit("messageError", { 
                        error: "Missing required fields", 
                        messageId 
                    });
                }
                
                // Find the message 
                const message = await MessageModel.findById(messageId);
                
                // Check ownership
                if (!message || message.senderId.toString() !== senderId) {
                    return socket.emit("messageError", { 
                        error: "Message not found or unauthorized", 
                        messageId 
                    });
                }
                
                // Encrypt and update
                const encryptedText = encrypt(text);
                message.encMessage = encryptedText;
                message.edited = true;
                message.updatedAt = new Date();
                
                await message.save();
                
                const updatedData = {
                    _id: message._id,
                    text, // Send decrypted text
                    senderId,
                    timestamp: message.createdAt,
                    updatedAt: message.updatedAt,
                    edited: true
                };
                
                // Notify the receiver if they're online
                const receiverSocket = users.get(receiverId);
                if (receiverSocket) {
                    io.to(receiverSocket).emit("messageUpdated", updatedData);
                }
                
                // Confirm to sender
                socket.emit("messageUpdated", { 
                    ...updatedData,
                    success: true 
                });
            } catch (error) {
                console.error("Error updating message:", error);
                socket.emit("messageError", { 
                    error: "Failed to update message",
                    messageId 
                });
            }
        });

        // Handle deleting a message
        socket.on("deleteMessage", async ({ messageId, senderId, receiverId }) => {
            try {
                if (!messageId || !senderId || !receiverId) {
                    return socket.emit("messageError", { 
                        error: "Missing required fields", 
                        messageId 
                    });
                }
                
                // Find the message
                const message = await MessageModel.findById(messageId);
                
                // Check ownership
                if (!message || message.senderId.toString() !== senderId) {
                    return socket.emit("messageError", { 
                        error: "Message not found or unauthorized", 
                        messageId 
                    });
                }
                
                // Delete the message
                await MessageModel.findByIdAndDelete(messageId);
                
                // Notify the receiver if they're online
                const receiverSocket = users.get(receiverId);
                if (receiverSocket) {
                    io.to(receiverSocket).emit("messageDeleted", messageId);
                }
                
                // Confirm to sender
                socket.emit("messageDeleted", { messageId, success: true });
            } catch (error) {
                console.error("Error deleting message:", error);
                socket.emit("messageError", { 
                    error: "Failed to delete message", 
                    messageId 
                });
            }
        });

        // Handle read receipts
        socket.on("markAsRead", async ({ messageIds, receiverId, senderId }) => {
            try {
                if (!Array.isArray(messageIds) || !messageIds.length || !receiverId || !senderId) {
                    return socket.emit("error", { message: "Invalid parameters for markAsRead" });
                }
                
                // Update messages as read in database
                await MessageModel.updateMany(
                    { _id: { $in: messageIds }, senderId, receiverId },
                    { $set: { status: "read" } }
                );
                
                // Notify the sender that messages were read
                const senderSocket = users.get(senderId);
                if (senderSocket) {
                    messageIds.forEach(messageId => {
                        io.to(senderSocket).emit("messageStatus", {
                            messageId,
                            status: "read"
                        });
                    });
                }
                
                // Confirm to the client
                socket.emit("messagesMarkedAsRead", { success: true, count: messageIds.length });
            } catch (error) {
                console.error("Error marking messages as read:", error);
                socket.emit("error", { message: "Failed to mark messages as read" });
            }
        });

        // Handle typing indicators
        socket.on("typing", ({ senderId, receiverId, isTyping }) => {
            const receiverSocket = users.get(receiverId);
            if (receiverSocket) {
                io.to(receiverSocket).emit("userTyping", {
                    userId: senderId,
                    isTyping
                });
            }
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            if (currentUserId) {
                // Remove the user from online users map
                users.delete(currentUserId);
                console.log(`User ${currentUserId} disconnected`);
                
                // Broadcast to all clients that this user is offline
                io.emit("userStatusChange", {
                    userId: currentUserId,
                    status: "offline"
                });
            }
        });
    });

    return io;
};

module.exports = setupSocket;