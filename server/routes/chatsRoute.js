const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getHistory, getConversation, deleteMessage, editMessage, markRead, calculateUnread } = require("../controllers/chatControllers")

router.use(authMiddleware)

router.get("/history/:receiverId", getHistory);
router.get("/conversations", getConversation);
router.delete("/message/:messageId", deleteMessage);
router.put("/message/:messageId", editMessage);
router.post("/mark-read", markRead);
router.get("/unread-count/:senderId", calculateUnread);


module.exports = router;
