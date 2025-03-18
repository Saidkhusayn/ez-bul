const MessageModel = require('../models/Message');


const sendMessage = async (req, res) => { //not needed anymore
    try {
        const { senderId, receiverId, encMessage } = req.body;
        if (!receiverId || !encMessage) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newMessage = new MessageModel({
            senderId,
            receiverId,
            encMessage,
        });

        await newMessage.save();

        // Emit the message via WebSocket
        const io = req.app.get("io"); // Get Socket.io instance
        io.to(receiverId).emit("receiveMessage", {
            senderId,
            text: encMessage,
        });

        res.status(201).json(newMessage);
    } catch (err) {
        console.error("Error saving message:", err);
        res.status(500).json({ error: "Failed to send message", details: err.message });
    }
};


const loadContacts = async(req, res) => {
    try {
        const userId = req.user.id;
        const chats = await MessageModel.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        })
        // Populate with the "username" field from the User model
        .populate("senderId receiverId", "username");

        // Create a set of unique contacts (exclude the current user)
        const contactSet = new Map();
        chats.forEach(chat => {
            if (chat.senderId._id.toString() !== userId) {
                contactSet.set(chat.senderId._id.toString(), chat.senderId.username);
            }
            if (chat.receiverId._id.toString() !== userId) {
                contactSet.set(chat.receiverId._id.toString(), chat.receiverId.username);
            }
        });

        const contacts = Array.from(contactSet, ([id, username]) => ({ _id: id, username }));
        res.json(contacts);

    } catch (err) {
        console.error("Error loading chats:", err);
        res.status(500).json({ error: "Failed to load chats", details: err.message });
    }
};


const loadChatHistory = async(req, res) => {
    const userId = req.user.id;
    const receiverId  = req.query.receiverId;

    if (!receiverId) {
        return res.status(400).json({ error: "Missing the receiver's ID" });
    }

    try {
        // Fetch the messages from the database
        const allMessages = await MessageModel.find({
            $or: [
                { senderId: userId, receiverId: receiverId },
                { senderId: receiverId, receiverId: userId } // Include received messages
            ]
        });

        // Create an array to store the messages in the correct format
        const messages = allMessages.map((message) => ({
            _id: message._id,
            text: message.encMessage,
            isSender: message.senderId.toString() === userId,
        }));

        res.json(messages); // Return the messages as a response
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ error: "Error fetching chat history" });
    }
}

module.exports = { sendMessage, loadContacts, loadChatHistory };