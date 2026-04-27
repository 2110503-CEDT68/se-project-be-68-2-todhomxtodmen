const express = require("express");
const {
  getProviderReviews,
  createReview,
  updateReview,
  deleteReview,
  canReview,
} = require("../controllers/reviews");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Provider reviews
 */

/**
 * @swagger
 * /api/providers/{providerId}/reviews/can-review:
 *   get:
 *     summary: Check if the current user can review this provider
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review eligibility
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:             { type: boolean }
 *                 canReview:           { type: boolean }
 *                 hasCompletedRentals: { type: boolean }
 *                 availableRentals:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Rental' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/can-review", protect, canReview);

/**
 * @swagger
 * /api/providers/{providerId}/reviews:
 *   get:
 *     summary: Get all reviews for a provider (public)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Review' }
 *   post:
 *     summary: Create a review (requires completed rental for this provider)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:   { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               comment:  { type: string, example: "Great service!", maxLength: 500 }
 *               rentalId: { type: string, description: "Optional — select specific rental to review" }
 *     responses:
 *       201:
 *         description: Review created; provider avgRating recalculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Review' }
 *       400:
 *         description: No eligible rental or already reviewed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router
  .route("/")
  .get(getProviderReviews)
  .post(protect, authorize("user", "admin"), createReview);

/**
 * @swagger
 * /api/providers/{providerId}/reviews/{reviewId}:
 *   put:
 *     summary: Update own review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:  { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Review updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Review' }
 *       401:
 *         description: Not owner
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Delete a review (owner or admin)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review deleted; provider avgRating recalculated
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
  .route("/:reviewId")
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;
