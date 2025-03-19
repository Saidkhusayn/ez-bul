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
        const username = req.params.username; 
        const user = await UserModel.findOne({ username }).select("_id username name profilePicture bio type country province languages"); 
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: "Failed to get user object", details: err.message });
    }
  };


module.exports = { searchUsers, viewUser }