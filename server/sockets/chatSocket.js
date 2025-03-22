const socketIO = require("socket.io");
const MessageModel = require("../models/Message");
const { encrypt, decrypt } = require("../utils/encrypt");

const setupSocket = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Map to track users - making this accessible to the main app
    const users = new Map(); // Map userId to socketId
    io.users = users; // Export the users map

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        // Handle user joining with their userId
        socket.on("join", (userId) => {
            if (!userId) {
                return socket.emit("error", { message: "Invalid user ID" });
            }
            
            users.set(userId, socket.id);
            console.log(`User ${userId} connected with socket ID: ${socket.id}`);
            
            // Notify user of successful connection
            socket.emit("joined", { success: true });
        });

        // Handle sending a message
        socket.on("sendMessage", async ({ senderId, receiverId, text, tempId, timestamp }) => {
            try {
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
                    // Send decrypted message to the receiver
                    io.to(receiverSocket).emit("receiveMessage", {
                        ...messageData,
                        status: "delivered" // Update status to delivered
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
            // Find and remove the user from the map
            users.forEach((socketId, userId) => {
                if (socketId === socket.id) {
                    users.delete(userId);
                    console.log(`User ${userId} disconnected`);
                }
            });
        });
    });

    return io;
};

module.exports = setupSocket;