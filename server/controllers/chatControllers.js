const MessageModel = require('../models/Message');
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encrypt');

/**
 * Get chat history between current user and receiver
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { receiverId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: 'Invalid receiver ID' });
    }
    
    const messages = await MessageModel.find({
      $or: [
        { senderId: userId, receiverId },
        { senderId: receiverId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    const decryptedMessages = messages.map(msg => {
      const message = msg.toObject();
      return {
        _id: message._id,
        senderId: message.senderId,
        text: decrypt(message.encMessage),
        timestamp: message.createdAt,
        updatedAt: message.updatedAt,
        status: message.status,
        edited: message.edited,
        isSender: message.senderId.toString() === userId,
      };
    });
    
    res.json(decryptedMessages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

/**
 * Get recent conversations for the current user
 */
const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const objectId = new mongoose.Types.ObjectId(userId);
    
    // Find the latest message with each user
    const latestMessages = await MessageModel.aggregate([
      // Match messages where current user is sender or receiver
      {
        $match: {
          $or: [
            { senderId: objectId },
            { receiverId: objectId }
          ]
        }
      },
      // Sort by newest first
      { $sort: { createdAt: -1 } },
      // Group by conversation partner
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', objectId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      // Join with user info
      {
        $lookup: {
          from: 'users', 
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      // Unwind the array created by lookup
      { $unwind: '$userInfo' },
      // Shape the output data
      {
        $project: {
          _id: 1,
          userId: '$_id',
          username: '$userInfo.username',
          name: '$userInfo.name',
          profilePicture: '$userInfo.profilePicture',
          lastMessage: {
            _id: '$lastMessage._id',
            text: '$lastMessage.encMessage', 
            senderId: '$lastMessage.senderId',
            timestamp: '$lastMessage.createdAt',
            status: '$lastMessage.status'
          }
        }
      },
      // Sort conversations by most recent message
      { $sort: { 'lastMessage.timestamp': -1 } }
    ]);
    
    // Decrypt the last messages
    const decryptedConversations = latestMessages.map(convo => ({
      ...convo,
      lastMessage: {
        ...convo.lastMessage,
        text: decrypt(convo.lastMessage.text),
        isSender: convo.lastMessage.senderId.toString() === userId
      }
    }));
    
    res.json(decryptedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

/**
 * Delete a message
 */
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    // Find the message and verify ownership
    const message = await MessageModel.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Delete the message
    await MessageModel.findByIdAndDelete(messageId);
    
    // Get receiver ID for socket notification
    const receiverId = message.receiverId.toString();
    
    // Notify via socket if connected
    notifyViaSocket(req, receiverId, 'messageDeleted', messageId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

/**
 * Edit a message
 */
const editMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { text } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Find the message and verify ownership
    const message = await MessageModel.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }
    
    // Encrypt and update
    const encryptedText = encrypt(text);
    message.encMessage = encryptedText;
    message.edited = true;
    message.updatedAt = new Date();
    
    await message.save();
    
    // Get receiver ID for socket notification
    const receiverId = message.receiverId.toString();
    
    // Prepare message data for socket notification
    const messageData = {
      _id: message._id,
      text, // Original text, not encrypted
      senderId: userId,
      timestamp: message.createdAt,
      updatedAt: message.updatedAt,
      edited: true
    };
    
    // Notify via socket if connected
    notifyViaSocket(req, receiverId, 'messageUpdated', messageData);
    
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
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
};

/**
 * Mark messages as read
 */
const markRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageIds, senderId } = req.body;
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Invalid message IDs' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ error: 'Invalid sender ID' });
    }
    
    // Validate all message IDs
    const validMessageIds = messageIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validMessageIds.length === 0) {
      return res.status(400).json({ error: 'No valid message IDs provided' });
    }
    
    // Update message status
    const updateResult = await MessageModel.updateMany(
      { 
        _id: { $in: validMessageIds },
        senderId,
        receiverId: userId, 
        status: { $ne: 'read' } 
      },
      { $set: { status: 'read' } }
    );
    
    // Get count of updated documents
    const updatedCount = updateResult.nModified || updateResult.modifiedCount || 0;
    
    // Notify sender via socket for each message
    const io = req.app.get('io');
    const users = req.app.get('users');
    if (io && users) {
      const senderSocketId = users.get(senderId);
      if (senderSocketId) {
        validMessageIds.forEach(messageId => {
          io.to(senderSocketId).emit('messageStatus', {
            messageId,
            status: 'read'
          });
        });
      }
    }
    
    res.json({ success: true, updated: updatedCount });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

/**
 * Get unread message count from a specific sender
 */
const calculateUnread = async (req, res) => {
  try {
    const userId = req.user.id;
    const { senderId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ error: 'Invalid sender ID' });
    }
    
    // Count unread messages from this sender
    const count = await MessageModel.countDocuments({
      senderId,
      receiverId: userId,
      status: { $ne: 'read' }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread message count' });
  }
};

/**
 * Helper function to notify users via socket
 */
function notifyViaSocket(req, recipientId, eventName, data) {
  const io = req.app.get('io');
  const users = req.app.get('users');
  
  if (!io || !users) return;
  
  const recipientSocketId = users.get(recipientId);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit(eventName, data);
  }
}

module.exports = { 
  getHistory, 
  getConversation, 
  deleteMessage, 
  editMessage, 
  markRead, 
  calculateUnread 
};