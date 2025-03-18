const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const UserModel = require("../models/Users");
const {upload} = require('../utils/cloudinaryImg')

// Middleware
router.use(authMiddleware);

const passUserObject = async (req, res) => {
    try {
        const username = req.params.username; 
        const user = await UserModel.findOne({ username }).select("-password -__v"); 
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: "Failed to get user object", details: err.message });
    }
  };

const uploadProfilePicture = async(req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const imageUrl = req.file.path; // Cloudinary returns the URL
  // Example: Store the URL in MongoDB (assuming user ID is in req.body)
  await UserModel.findByIdAndUpdate(req.user.id, { profilePicture: imageUrl });

  res.json({ url: imageUrl });
}

const editProfile = async (req, res) => {
    console.log("Edit profile endpoint hit", req.method, req.url);
    try {
      const userId = req.user.id;
      const allowedFields = [
        "name",
        "email",
        "country",
        "province",
        "city",
        "profilePicture",
        "birthday",
        "open",
        "type",
        "rate",
        "languages",
        "bio",
      ];
      const payload = {};
  
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          payload[field] = req.body[field];
        }
      });
  
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Apply the payload updates to the user document
      Object.assign(user, payload);
      await user.save();
  
      res.status(200).json({ message: "Profile updated successfully", user });
    } catch (err) {
      console.error("Error in editing:", err);
      res.status(500).json({ error: "Failed to edit profile", details: err.message });
    }
  };  
  

router.post("/upload", upload.single("profilePicture"), uploadProfilePicture)
router.put("/edit", editProfile);
router.get("/:username", passUserObject);


module.exports = router;