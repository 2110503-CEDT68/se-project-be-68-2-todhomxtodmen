const express = require("express");
const { register, login, getMe, logout } = require("../controllers/auth"); // เพิ่ม logout

const router = express.Router();

const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout); // ระบบต้องยอมให้ User log out ได้
router.get("/me", protect, getMe);

module.exports = router;
