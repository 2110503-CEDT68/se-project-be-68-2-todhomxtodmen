const express = require("express");
const { getNotifications, markAsRead, markAllAsRead } = require("../controllers/notifications");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);

module.exports = router;
