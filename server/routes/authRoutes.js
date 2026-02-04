const express = require("express");
const { login, register } = require("../controllers/authController");

const router = express.Router();

// LOGIN
router.post("/login", login);

// REGISTER
router.post("/register", register);

module.exports = router;
