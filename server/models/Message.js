const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    encMessage: { type: String, required: true }, 
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    edited: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
  }, 
  { timestamps: true }
);
  
// Create indexes for faster queries
MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ createdAt: -1 }); // Use createdAt which is added by timestamps option

module.exports = mongoose.model("Message", MessageSchema);
