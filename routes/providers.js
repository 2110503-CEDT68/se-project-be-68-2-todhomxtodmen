const express = require("express");
const {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderDetail,
} = require("../controllers/providers");

const rentalRouter = require("./rentals");
const carRouter = require("./cars");

const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Providers
 *   description: Car rental provider management
 */

router.use("/:providerId/rentals/", rentalRouter);
router.use("/:providerId/cars/", carRouter);

/**
 * @swagger
 * /api/providers:
 *   get:
 *     summary: Get all providers
 *     tags: [Providers]
 *     parameters:
 *       - in: query
 *         name: select
 *         schema: { type: string }
 *         description: Comma-separated fields to return
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: Sort field(s), prefix with - for desc
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of providers (each includes virtual cars array)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Provider' }
 *   post:
 *     summary: Create a new provider (admin only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address]
 *             properties:
 *               name:      { type: string, example: "Bangkok Car Rental" }
 *               address:   { type: string, example: "123 Sukhumvit Rd" }
 *               telephone: { type: string, example: "0212345678" }
 *     responses:
 *       201:
 *         description: Provider created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Provider' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router
  .route("/")
  .get(getProviders)
  .post(protect, authorize("admin"), createProvider);

/**
 * @swagger
 * /api/providers/{id}:
 *   get:
 *     summary: Get a single provider
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Provider data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Provider' }
 *       400:
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Update a provider (admin only)
 *     tags: [Providers]
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
 *               name:      { type: string }
 *               address:   { type: string }
 *               telephone: { type: string }
 *     responses:
 *       200:
 *         description: Updated provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Provider' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Delete a provider (admin only, cascades rentals & cars)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Provider deleted
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
  .get(getProvider)
  .put(protect, authorize("admin"), updateProvider)
  .delete(protect, authorize("admin"), deleteProvider);

/**
 * @swagger
 * /api/providers/{id}/detail:
 *   get:
 *     summary: Get provider with cars, bookings, and reviews in one request
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Provider detail bundle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider:  { $ref: '#/components/schemas/Provider' }
 *                     cars:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Car' }
 *                     bookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           car:        { type: string }
 *                           rentalDate: { type: string, format: date }
 *                           returnDate: { type: string, format: date }
 *                     reviews:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Review' }
 *       404:
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/:id/detail", getProviderDetail);

module.exports = router;
