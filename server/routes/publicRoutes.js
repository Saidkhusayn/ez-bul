const express = require('express');
const {searchUsers } = require("../controllers/publicController");

const router = express.Router();


router.get("/search", searchUsers);


module.exports = router
