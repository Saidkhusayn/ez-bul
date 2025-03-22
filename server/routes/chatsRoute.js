const express = require("express");
const router = express.Router();
const MessageModel = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/encrypt");

router.use(authMiddleware)

// Get chat history with a specific user
const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { receiverId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ error: "Invalid receiver ID" });
        }
        
        // Fetch encrypted messages - using proper ObjectId comparison
        const messages = await MessageModel.find({
            $or: [
                { senderId: userId, receiverId: receiverId },
                { senderId: receiverId, receiverId: userId }
            ]
        }).sort({ createdAt: 1 });
        
        // Decrypt messages
        const decryptedMessages = messages.map(msg => {
            const message = msg.toObject();
            return {
                _id: message._id,
                senderId: message.senderId,
                text: decrypt(message.encMessage), // Decrypt the message
                timestamp: message.createdAt,
                updatedAt: message.updatedAt,
                status: message.status,
                edited: message.edited,
                isSender: message.senderId.toString() === userId
            };
        });
        
        res.json(decryptedMessages);
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
};

// Delete a message
router.delete("/message/:messageId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }
        
        // Find the message and verify ownership
        const message = await MessageModel.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ error: "You can only delete your own messages" });
        }
        
        // Delete the message
        await MessageModel.findByIdAndDelete(messageId);
        
        // Get receiver ID for socket notification
        const receiverId = message.receiverId.toString();
        
        // Notify via socket if connected
        const io = req.app.get("io");
        const users = req.app.get("users");
        if (io && users) {
            const receiverSocketId = users.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("messageDeleted", messageId);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({ error: "Failed to delete message" });
    }
});

// Edit a message
router.put("/message/:messageId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const { text } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }
        
        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Message cannot be empty" });
        }
        
        // Find the message and verify ownership
        const message = await MessageModel.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ error: "You can only edit your own messages" });
        }
        
        // Encrypt and update
        const encryptedText = encrypt(text);
        message.encMessage = encryptedText;
        message.edited = true;
        message.updatedAt = new Date();
        
        await message.save();
        
        // Get receiver ID for socket notification
        const receiverId = message.receiverId.toString();
        
        // Notify via socket if connected
        const io = req.app.get("io");
        const users = req.app.get("users");
        if (io && users) {
            const receiverSocketId = users.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("messageUpdated", {
                    _id: message._id,
                    text, // Original text, not encrypted
                    senderId: userId,
                    timestamp: message.createdAt,
                    updatedAt: message.updatedAt,
                    edited: true
                });
            }
        }
        
        res.json({ 
            success: true,
            message: {
                _id: message._id,
                text,
                edited: true,
                timestamp: message.createdAt,
                updatedAt: message.updatedAt
            }
        });
    } catch (error) {
        console.error("Error updating message:", error);
        res.status(500).json({ error: "Failed to update message" });
    }
});

// Mark messages as read
router.post("/mark-read", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageIds, senderId } = req.body;
        
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ error: "Invalid message IDs" });
        }
        
        if (!mongoose.Types.ObjectId.isValid(senderId)) {
            return res.status(400).json({ error: "Invalid sender ID" });
        }
        
        // Validate all message IDs
        const validMessageIds = messageIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        
        // Update message status
        const updateResult = await MessageModel.updateMany(
            { 
                _id: { $in: validMessageIds },
                senderId,
                receiverId: userId, // Ensure the authenticated user is the receiver
                status: { $ne: "read" } // Only update if not already read
            },
            { $set: { status: "read" } }
        );
        
        // Notify sender via socket if connected
        const io = req.app.get("io");
        const users = req.app.get("users");
        if (io && users) {
            const senderSocketId = users.get(senderId);
            if (senderSocketId) {
                validMessageIds.forEach(messageId => {
                    io.to(senderSocketId).emit("messageStatus", {
                        messageId,
                        status: "read"
                    });
                });
            }
        }
        
        res.json({ 
            success: true, 
            updated: updateResult.nModified || updateResult.modifiedCount || 0 
        });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
});

// Get recent conversations
router.get("/conversations", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const objectId = new mongoose.Types.ObjectId(userId);
        
        // Find the latest message with each user - fixed aggregation
        const latestMessages = await MessageModel.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: objectId },
                        { receiverId: objectId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$senderId", objectId] },
                            "$receiverId",
                            "$senderId"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            {
                $lookup: {
                    from: "users", // Make sure this matches your actual collection name
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            {
                $unwind: "$userInfo"
            },
            {
                $project: {
                    _id: 1,
                    userId: "$_id",
                    username: "$userInfo.username",
                    name: "$userInfo.name",
                    profilePicture: "$userInfo.profilePicture",
                    lastMessage: {
                        _id: "$lastMessage._id",
                        text: "$lastMessage.encMessage", // Still encrypted
                        senderId: "$lastMessage.senderId",
                        timestamp: "$lastMessage.createdAt",
                        status: "$lastMessage.status"
                    }
                }
            },
            {
                $sort: { "lastMessage.timestamp": -1 } // Sort by most recent message
            }
        ]);
        
        // Decrypt the last messages
        const decryptedConversations = latestMessages.map(convo => {
            return {
                ...convo,
                lastMessage: {
                    ...convo.lastMessage,
                    text: decrypt(convo.lastMessage.text), // Decrypt message text
                    isSender: convo.lastMessage.senderId.toString() === userId
                }
            };
        });
        
        res.json(decryptedConversations);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
});

// Get unread message count 
router.get("/unread-count/:senderId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { senderId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(senderId)) {
            return res.status(400).json({ error: "Invalid sender ID" });
        }
        
        // Count unread messages from this sender
        const count = await MessageModel.countDocuments({
            senderId,
            receiverId: userId,
            status: { $ne: "read" }
        });
        
        res.json({ count });
    } catch (error) {
        console.error("Error getting unread count:", error);
        res.status(500).json({ error: "Failed to get unread message count" });
    }
});


router.get("/history/:receiverId", getHistory);

module.exports = router;
