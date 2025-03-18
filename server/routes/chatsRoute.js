const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { sendMessage, loadContacts, loadChatHistory } = require('../controllers/chatControllers')


router.use(authMiddleware);

router.post("/send-message", sendMessage);
router.get("/load", loadContacts);
router.get("/history", loadChatHistory);



module.exports = router;
