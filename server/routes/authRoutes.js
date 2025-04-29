const express = require('express');
const { registerUser, loginUser, isUsernameTaken, logout } = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logout);
router.get("/check-username/:username", isUsernameTaken);


module.exports = router;