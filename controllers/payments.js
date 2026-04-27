const Rental = require("../models/Rental");
const Notification = require("../models/Notification");
const {
  getRentalOrFail,
  isOwnerOrAdmin,
  populatedRentalQuery,
} = require("./rentals");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ---------- helpers ----------

function createNotification(userId, rentalId, message) {
  return Notification.create({ user: userId, rental: rentalId, message });
}

// ---------- controllers ----------

//@desc  Get QR URL for payment
//@route GET /api/rentals/:id/qr
//@access Private
exports.getQR = async (req, res) => {
  try {
    const rental = await getRentalOrFail(req.params.id, res);
    if (!rental) return;

    if (!isOwnerOrAdmin(rental, req.user)) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }
    if (rental.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This rental is not pending payment",
      });
    }

    const mockBankUrl = `${FRONTEND_URL}/mock-bank?ref=${rental._id}&amount=${rental.totalAmount}`;
    res.status(200).json({ success: true, data: { url: mockBankUrl } });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot generate QR" });
  }
};

//@desc  Get payment status (polling)
//@route GET /api/rentals/:id/status
//@access Private
exports.getPaymentStatus = async (req, res) => {
  try {
    const rental = await getRentalOrFail(req.params.id, res);
    if (!rental) return;

    if (!isOwnerOrAdmin(rental, req.user)) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentStatus: rental.paymentStatus,
        refundStatus: rental.refundStatus,
        totalAmount: rental.totalAmount,
      },
    });
  } catch (err) {
    console.error(err.stack);
    res
      .status(500)
      .json({ success: false, message: "Cannot get payment status" });
  }
};

//@desc  Webhook — called by Mock Bank page after user confirms payment
//@route POST /api/rentals/webhook/payment
//@access Public (internal)
exports.webhookPayment = async (req, res) => {
  try {
    const { ref, status } = req.body;

    if (!ref || status !== "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook payload" });
    }

    const rental = await Rental.findById(ref);
    if (!rental) {
      return res
        .status(404)
        .json({ success: false, message: "Rental not found" });
    }
    if (rental.paymentStatus !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Rental is not pending payment" });
    }

    rental.paymentStatus = "paid";
    rental.paidAt = new Date();
    await rental.save();

    await createNotification(
      rental.user,
      rental._id,
      "Your payment has been confirmed. Your booking is now active.",
    );

    res.status(200).json({
      success: true,
      data: { paymentStatus: rental.paymentStatus, provider: rental.provider },
    });
  } catch (err) {
    console.error(err.stack);
    res
      .status(500)
      .json({ success: false, message: "Webhook processing failed" });
  }
};

//@desc  Get receipt data
//@route GET /api/rentals/:id/receipt
//@access Private
exports.getReceipt = async (req, res) => {
  try {
    const rental = await populatedRentalQuery(Rental.findById(req.params.id));
    if (!rental) {
      return res
        .status(404)
        .json({ success: false, message: "Rental not found" });
    }

    // เปลี่ยนจาก isOwnerOrAdmin(rental, req.user)
    // เพราะหลัง populate rental.user เป็น object แล้ว ต้องใช้ ._id
    const ownerId =
      typeof rental.user === "object"
        ? rental.user._id.toString()
        : rental.user.toString();
    if (ownerId !== req.user.id && req.user.role !== "admin") {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    if (rental.paymentStatus !== "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not completed" });
    }

    res.status(200).json({ success: true, data: rental });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot get receipt" });
  }
};

//@desc  Admin — update payment status
//@route PATCH /api/rentals/:id/payment-status
//@access Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, refundStatus } = req.body;

    const rental = await getRentalOrFail(req.params.id, res);
    if (!rental) return;

    const update = {};
    let notificationMsg = null;

    if (paymentStatus) {
      update.paymentStatus = paymentStatus;
      if (paymentStatus === "paid" && !rental.paidAt) {
        update.paidAt = new Date();
        notificationMsg =
          "Your payment status has been updated to paid by admin.";
      }
    }

    if (refundStatus) {
      update.refundStatus = refundStatus;
      if (refundStatus === "completed") {
        update.paymentStatus = "refunded";
        notificationMsg =
          "Your refund has been processed. The amount will be returned shortly.";
      } else if (refundStatus === "requested") {
        notificationMsg =
          "Your refund request has been received and is being reviewed.";
      }
    }

    await Rental.findByIdAndUpdate(req.params.id, update, {
      runValidators: true,
    });

    if (notificationMsg) {
      await createNotification(rental.user, rental._id, notificationMsg);
    }

    const updated = await Rental.findById(req.params.id);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error(err.stack);
    res
      .status(500)
      .json({ success: false, message: "Cannot update payment status" });
  }
};

//@desc  Cancel rental and request refund (3-day policy)
//@route POST /api/rentals/:id/cancel
//@access Private
exports.cancelRental = async (req, res) => {
  try {
    const rental = await getRentalOrFail(req.params.id, res);
    if (!rental) return;

    if (!isOwnerOrAdmin(rental, req.user)) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    if (rental.paymentStatus === "refunded" || rental.refundStatus !== "none") {
      return res
        .status(400)
        .json({ success: false, message: "This rental is already cancelled" });
    }

    const pickupDate = new Date(rental.rentalDate);
    const now = new Date();
    const daysUntilPickup = (pickupDate - now) / 86_400_000;

    if (daysUntilPickup < 3) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation is only allowed at least 3 days before the pickup date. Refund cannot be processed.",
      });
    }

    rental.cancelledAt = new Date();
    rental.refundStatus = "requested";
    await rental.save();

    await createNotification(
      rental.user,
      rental._id,
      `Your booking has been cancelled. A full refund of ฿${rental.totalAmount.toLocaleString()} will be processed shortly.`,
    );

    res.status(200).json({ success: true, data: rental });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot cancel rental" });
  }
};
