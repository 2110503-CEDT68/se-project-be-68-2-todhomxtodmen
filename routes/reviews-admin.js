const express = require("express");
const { getAllReviews } = require("../controllers/reviews");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get all reviews across all providers (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All reviews
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
 *       401:
 *         description: Admin only
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/", protect, authorize("admin"), getAllReviews);

module.exports = router;
