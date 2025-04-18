const express = require('express');
const { searchUsers, viewUser, searchLocations } = require("../controllers/publicController");

const router = express.Router();


router.get("/search", searchUsers);
router.get("/search/locations", searchLocations); // Add new endpoint
router.get("/:username", viewUser);


module.exports = router
