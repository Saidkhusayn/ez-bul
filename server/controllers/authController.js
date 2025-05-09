const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const { generateToken, generateRefreshToken } = require("../utils/generateToken");

const registerUser = async (req, res) => {
  try {
    const { username, email, password, name, birthday, bio, country, province, city, languages, open, type, rate } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10); 
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save the new user
    const newUser = new User({ username, email, password: hashedPassword, name, birthday, bio, country, province, city, languages, open, type, rate });
    await newUser.save();

    // Generate and return a token
    const token = await generateToken(newUser._id);
    const refreshToken = await generateRefreshToken(newUser._id); 
    
    res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "Strict" }); //secure: true,
    res.status(201).json({ token, userId: newUser._id, username: newUser.username });

  } catch (err) {
    console.error("Error in registerUser:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }); 
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    // Generate and return AccessToken
    const token = await generateToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);
    res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "Strict" }); //secure: true,
    res.json({ token, refreshToken, userId: user._id, username: user.username });

  } catch (err) {
    console.error("Error in loginUser:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const isUsernameTaken = async(req, res) => {
  try {
    const { username } = req.params;
    
    // Query your database to check if the username exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    // Return the availability status
    res.json({ 
      available: !existingUser,
      message: existingUser ? "Username is already taken" : "Username is available"
    });
  } catch (error) {
    console.error("Error checking username:", error);
    res.status(500).json({ error: "Server error" });
  }
}

const logout = (req, res) => {
  res.clearCookie("refreshToken", { 
    httpOnly: true,
    sameSite: "Strict",
    // secure: true, // Uncomment this in production if using HTTPS
  });
  res.status(200).json({ message: "Logged out successfully." });
};


module.exports = { registerUser, loginUser, isUsernameTaken, logout };