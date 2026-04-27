const express = require("express");
const { register, login, getMe, logout } = require("../controllers/auth");

const router = express.Router();

const { protect } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, telephone]
 *             properties:
 *               name:      { type: string, example: "John Doe" }
 *               email:     { type: string, format: email, example: "john@example.com" }
 *               password:  { type: string, minLength: 6, example: "secret123" }
 *               telephone: { type: string, example: "0812345678" }
 *               role:      { type: string, enum: [user, admin], example: "user" }
 *     responses:
 *       200:
 *         description: Registered successfully, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 token:   { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email, example: "john@example.com" }
 *               password: { type: string, example: "secret123" }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 token:   { type: string }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout (clears cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.get("/logout", logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get currently logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/me", protect, getMe);

module.exports = router;
