const jwt = require('jsonwebtoken')
require('dotenv').config();

const generateToken = async (userId) => {
    const token = jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: "1h"});
    return token;   
}

const generateRefreshToken = async (userId) => {
    const token = jwt.sign({ id: userId }, process.env.REFRESH_SECRET, { expiresIn: "7d" });
    return token;
  };

module.exports = { generateToken, generateRefreshToken };