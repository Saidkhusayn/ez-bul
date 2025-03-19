const express = require('express');
const { searchUsers, viewUser } = require("../controllers/publicController");

const router = express.Router();


router.get("/search", searchUsers);
router.get("/:username", viewUser);


module.exports = router
