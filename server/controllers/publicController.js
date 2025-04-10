const UserModel = require("../models/Users");

const searchUsers = async(req, res) => {
    try{
      const query = req.query.query;
      if (!query) return res.json([]);

      const users = await UserModel.find({
          $or: [
              {username: { $regex: query, $options: "i" } },
              { name: { $regex: query, $options: "ix" }},
          ],
      }).limit(10).select("username name");

      res.json(users);

    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Server Search Failed"})
    }
};

const viewUser = async (req, res) => {
    try {
        const identifier = req.params.username;
        console.log("Looking up user with identifier:", identifier);
        
        // Check if the identifier is a valid MongoDB ObjectId
        const ObjectId = require('mongoose').Types.ObjectId;
        const isValidObjectId = ObjectId.isValid(identifier);
        
        // Build query based on whether identifier might be an ObjectId
        let query = { username: identifier };
        if (isValidObjectId) {
          query = { $or: [{ username: identifier }, { _id: identifier }] };
        }
        
        const user = await UserModel.findOne(query);
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        console.log("Found user:", user);
        res.json(user);
        
      } catch (err) {
        console.error("Error in viewUser:", err);
        res.status(500).json({ error: "Failed to get user object", details: err.message });
      }
  };


module.exports = { searchUsers, viewUser }