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


module.exports = { searchUsers }