const Notification = require("../models/Notification");

//@desc  Get notifications for current user
//@route GET /api/notifications
//@access Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot get notifications" });
  }
};

//@desc  Mark notification as read
//@route PUT /api/notifications/:id/read
//@access Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot update notification" });
  }
};

//@desc  Mark all notifications as read
//@route PUT /api/notifications/read-all
//@access Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot update notifications" });
  }
};
