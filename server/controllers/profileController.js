const UserModel = require("../models/Users");

const passUserObject = async (req, res) => {
    try {
        const userId = req.user.id; 
        const user = await UserModel.findById(userId).select("-password -__v"); 
        res.json({ user, message: "Profile info fetched" });
    } catch (err) {
        res.status(500).json({ error: "Failed to get user object", details: err.message });
    }
};

const uploadProfilePicture = async(req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const imageUrl = req.file.path; // Cloudinary returns the URL
  await UserModel.findByIdAndUpdate(req.user.id, { profilePicture: imageUrl });

  res.json({ url: imageUrl });
};

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
          // Store the objects directly for country, province, city, and languages
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

const getAllHosts = async (req, res) => {
  try {
    const hosts = await UserModel.find({ open: 'Yes' }).select("-password -__v");
    res.json(hosts);
  } catch (err) {
    res.status(500).json({ error: "Failed to get hosts", details: err.message });
  }
};

const getFilteredHosts = async (req, res) => {
  try {
    // Extract filter parameters from request body
    const { country, province, city, languages, type } = req.body;
    
    // Start with base query - hosts who are open
    let query = { open: 'Yes' };
    
    // Add location filters if provided
    if (city) {
      query['city.value'] = city;
    } else if (province) {
      query['province.value'] = province;
    } else if (country) {
      query['country.value'] = country;
    }
    
    // Add language filter if provided
    if (languages && languages.length > 0) {
      query['languages'] = {
        $elemMatch: {
          value: { $in: languages }
        }
      };
    }
    
    // Add type filter if provided
    if (type) {
      query.type = type;
    }
    
    // Find hosts matching the criteria
    const hosts = await UserModel.find(query).select("-password -__v");
    res.json(hosts);
  } catch (err) {
    res.status(500).json({ error: "Failed to get filtered hosts", details: err.message });
  }
};



// Update the module exports
module.exports = { 
  passUserObject, 
  uploadProfilePicture, 
  editProfile, 
  getAllHosts,
  getFilteredHosts,
};