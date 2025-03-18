const express = require('express');
const jwt = require("jsonwebtoken");
require("dotenv").config();

const router = express.Router();

// Genrate and return NewToken
const refreshToken = (req, res) => {
    try{
      const refreshToken = req.cookies.refreshToken;
      console.log(refreshToken);
    if (!refreshToken) return res.status(401).json({ message: "No refresh token" });
  
    jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Invalid refresh token" });
  
      const newAccessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.json({ accessToken: newAccessToken });
    });
    } catch(err) {
      console.error("Error in refreshToken:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
    
  }

router.post("/refresh", refreshToken);


module.exports = router;