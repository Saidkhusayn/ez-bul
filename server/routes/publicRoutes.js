const express = require('express');
const { searchUsers, viewUser, searchLocations, getFilteredHosts } = require("../controllers/publicController");
const cors = require('cors');
require('dotenv').config();

const router = express.Router();

router.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }));


router.get("/search", searchUsers);
router.get("/search/locations", searchLocations); 
router.post("/hosts", getFilteredHosts);
router.get("/:username", viewUser);


module.exports = router
