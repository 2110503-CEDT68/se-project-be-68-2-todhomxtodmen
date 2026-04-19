const express = require("express");
const {
  getRentals,
  getRental,
  addRental,
  updateRental,
  deleteRental,
} = require("../controllers/rentals");
const {
  getQR,
  getPaymentStatus,
  webhookPayment,
  getReceipt,
  updatePaymentStatus,
  cancelRental,
} = require("../controllers/payments");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

// Webhook (no auth — called by mock bank)
router.post("/webhook/payment", webhookPayment);

// Base CRUD
router
  .route("/")
  .get(protect, getRentals)
  .post(protect, authorize("user", "admin"), addRental);

router
  .route("/:id")
  .get(protect, getRental)
  .put(protect, authorize("user", "admin"), updateRental)
  .delete(protect, authorize("user", "admin"), deleteRental);

// Payment routes
router.get("/:id/qr", protect, getQR);
router.get("/:id/status", protect, getPaymentStatus);
router.get("/:id/receipt", protect, getReceipt);
router.patch("/:id/payment-status", protect, authorize("admin"), updatePaymentStatus);
router.post("/:id/cancel", protect, cancelRental);

module.exports = router;
