const express = require('express');
const { searchUsers, viewUser, searchLocations, getFilteredHosts } = require("../controllers/publicController");

const router = express.Router();

router.get("/search", searchUsers);
router.get("/search/locations", searchLocations); 
router.post("/hosts", getFilteredHosts);
router.get("/:username", viewUser);


module.exports = router
