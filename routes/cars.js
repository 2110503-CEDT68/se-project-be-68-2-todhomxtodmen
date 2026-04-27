const express = require("express");
const {
  getCars,
  getCar,
  getCarBookings,
  createCar,
  updateCar,
  deleteCar,
} = require("../controllers/cars");

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Cars
 *   description: Car management under a provider
 */

/**
 * @swagger
 * /api/cars:
 *   get:
 *     summary: Get all cars (public)
 *     tags: [Cars]
 *     responses:
 *       200:
 *         description: List of all cars
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Car' }
 */

/**
 * @swagger
 * /api/cars/{id}:
 *   get:
 *     summary: Get a single car by ID (public)
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Car data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Car' }
 *       404:
 *         description: Car not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Update a car by ID (admin only)
 *     tags: [Cars]
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
 *               brand:        { type: string }
 *               model:        { type: string }
 *               color:        { type: string }
 *               licensePlate: { type: string }
 *               dailyRate:    { type: number }
 *               available:    { type: boolean }
 *               image:        { type: string }
 *     responses:
 *       200:
 *         description: Updated car
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Car' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Delete a car by ID (admin only)
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Car deleted
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

/**
 * @swagger
 * /api/providers/{providerId}/cars:
 *   get:
 *     summary: Get all cars for a provider
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of cars
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Car' }
 *   post:
 *     summary: Create a car under a provider (admin only)
 *     tags: [Cars]
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
 *             required: [brand, model, color, licensePlate, dailyRate]
 *             properties:
 *               brand:        { type: string, example: "Toyota" }
 *               model:        { type: string, example: "Camry" }
 *               color:        { type: string, example: "White" }
 *               licensePlate: { type: string, example: "กข 1234" }
 *               dailyRate:    { type: number, example: 1200 }
 *               available:    { type: boolean, example: true }
 *               image:        { type: string, example: "https://example.com/car.jpg" }
 *     responses:
 *       201:
 *         description: Car created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Car' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route("/").get(getCars).post(protect, authorize("admin"), createCar);

/**
 * @swagger
 * /api/providers/{providerId}/cars/bookings:
 *   get:
 *     summary: Get all bookings (non-refunded) for all cars of a provider
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       car:        { type: string }
 *                       rentalDate: { type: string, format: date }
 *                       returnDate: { type: string, format: date }
 */
router.route("/bookings").get(getCarBookings);

/**
 * @swagger
 * /api/providers/{providerId}/cars/{id}:
 *   get:
 *     summary: Get a single car
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Car data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Car' }
 *       404:
 *         description: Car not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Update a car (admin only)
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
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
 *               brand:        { type: string }
 *               model:        { type: string }
 *               color:        { type: string }
 *               licensePlate: { type: string }
 *               dailyRate:    { type: number }
 *               available:    { type: boolean }
 *               image:        { type: string }
 *     responses:
 *       200:
 *         description: Updated car
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Car' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Delete a car (admin only)
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Car deleted
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
  .get(getCar)
  .put(protect, authorize("admin"), updateCar)
  .delete(protect, authorize("admin"), deleteCar);

module.exports = router;
