// First, let's modify your socket.js file to use encryption

const socketIO = require("socket.io");
const MessageModel = require("../models/Message");
const { encrypt, decrypt } = require("../utils/encrypt"); // Import the encryption utilities

const setupSocket = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: "*",  
            methods: ["GET", "POST"]
        }
    });

    const users = new Map();

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        // Handle user joining with their userId
        socket.on("join", (userId) => {
            users.set(userId, socket.id);
            console.log(`${userId} connected with socket ID: ${socket.id}`);
        });

        // Handle sending a message
        socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
            try {
                console.log("send message is fired!")
                
                // Encrypt the message before saving
                const encryptedText = encrypt(text);
                
                // Save encrypted message to MongoDB
                const newMessage = new MessageModel({
                    senderId,
                    receiverId,
                    encMessage: encryptedText, // Store the encrypted message
                });

                await newMessage.save();

                // Emit the message to the receiver
                const receiverSocket = users.get(receiverId);
                if (receiverSocket) {
                    io.to(receiverSocket).emit("receiveMessage", {
                        senderId,
                        text, // Send the original text to the receiver
                        // Alternative: Send encrypted text and decrypt on client side
                        // text: encryptedText,
                    });
                } else {
                    console.log("No receiverId found!");
                }
            } catch (error) {
                console.error("Error saving message:", error);
            }
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            users.forEach((socketId, userId) => {
                if (socketId === socket.id) {
                    users.delete(userId);
                }
            });
            console.log("Client disconnected:", socket.id);
        });
    });

    return io;
};

module.exports = setupSocket;
