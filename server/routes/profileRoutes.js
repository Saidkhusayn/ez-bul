const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {upload} = require('../utils/cloudinaryImg')
const { passUserObject, uploadProfilePicture, editProfile, getAllHosts, getFilteredHosts } = require("../controllers/profileController")

// Middleware
router.use(authMiddleware);

router.post("/upload", upload.single("profilePicture"), uploadProfilePicture)
router.put("/edit", editProfile);
router.get("/me", passUserObject);
router.get("/hosts", getAllHosts);
router.post("/filtered-hosts", getFilteredHosts);



module.exports = router;