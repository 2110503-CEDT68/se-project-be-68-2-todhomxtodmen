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

/**
 * @swagger
 * tags:
 *   name: Rentals
 *   description: Rental booking and payment management
 */

/**
 * @swagger
 * /api/rentals/webhook/payment:
 *   post:
 *     summary: Payment webhook called by mock bank after user confirms payment
 *     tags: [Rentals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ref, status]
 *             properties:
 *               ref:    { type: string, description: "Rental ID", example: "664a1b2c3d4e5f6789012347" }
 *               status: { type: string, enum: [paid], example: "paid" }
 *     responses:
 *       200:
 *         description: Payment processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:      { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentStatus: { type: string }
 *                     provider:      { type: string }
 *       400:
 *         description: Invalid payload or rental already paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/webhook/payment", webhookPayment);

/**
 * @swagger
 * /api/rentals:
 *   get:
 *     summary: Get rentals (own rentals for user, all for admin). Auto-expires pending past pickup.
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rentals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Rental' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   post:
 *     summary: Create a rental booking (max 3 active per user)
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rentalDate, returnDate, provider, car]
 *             properties:
 *               rentalDate: { type: string, format: date, example: "2025-06-01" }
 *               returnDate: { type: string, format: date, example: "2025-06-05" }
 *               provider:   { type: string, example: "664a1b2c3d4e5f6789012345" }
 *               car:        { type: string, example: "664a1b2c3d4e5f6789012346" }
 *     responses:
 *       200:
 *         description: Rental created with calculated totalAmount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Rental' }
 *       400:
 *         description: Overlap conflict, unavailable car, or limit reached
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router
  .route("/")
  .get(protect, getRentals)
  .post(protect, authorize("user", "admin"), addRental);

/**
 * @swagger
 * /api/rentals/{id}:
 *   get:
 *     summary: Get a single rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rental data (populated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Rental' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Update rental dates (recalculates total if pending)
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rentalDate: { type: string, format: date }
 *               returnDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Updated rental
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Rental' }
 *       400:
 *         description: Overlap conflict
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Delete a rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rental deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { type: object }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router
  .route("/:id")
  .get(protect, getRental)
  .put(protect, authorize("user", "admin"), updateRental)
  .delete(protect, authorize("user", "admin"), deleteRental);

/**
 * @swagger
 * /api/rentals/{id}/qr:
 *   get:
 *     summary: Get mock-bank QR URL for payment (pending rentals only)
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: QR URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     url: { type: string, example: "http://localhost:3000/mock-bank?ref=...&amount=4800" }
 *       400:
 *         description: Rental not pending
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/:id/qr", protect, getQR);

/**
 * @swagger
 * /api/rentals/{id}/status:
 *   get:
 *     summary: Get payment status (used for frontend polling)
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Current payment and refund status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentStatus: { type: string, enum: [pending, paid, refunded] }
 *                     refundStatus:  { type: string, enum: [none, requested, completed] }
 *                     totalAmount:   { type: number }
 */
router.get("/:id/status", protect, getPaymentStatus);

/**
 * @swagger
 * /api/rentals/{id}/receipt:
 *   get:
 *     summary: Get receipt for a paid rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rental receipt (fully populated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Rental' }
 *       400:
 *         description: Payment not completed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/:id/receipt", protect, getReceipt);

/**
 * @swagger
 * /api/rentals/{id}/payment-status:
 *   patch:
 *     summary: Admin — manually update payment or refund status
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentStatus: { type: string, enum: [pending, paid, refunded] }
 *               refundStatus:  { type: string, enum: [none, requested, completed] }
 *     responses:
 *       200:
 *         description: Updated rental
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Rental' }
 *       401:
 *         description: Admin only
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch("/:id/payment-status", protect, authorize("admin"), updatePaymentStatus);

/**
 * @swagger
 * /api/rentals/{id}/cancel:
 *   post:
 *     summary: Cancel a rental (must be ≥3 days before pickup, sets refundStatus to requested)
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rental cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Rental' }
 *       400:
 *         description: Cannot cancel (within 3 days or already cancelled)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/:id/cancel", protect, cancelRental);

module.exports = router;
