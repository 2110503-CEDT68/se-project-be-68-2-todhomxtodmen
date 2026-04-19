const express = require("express");
const {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderDetail,
} = require("../controllers/providers"); // providers

const rentalRouter = require("./rentals"); // (Rentals) or rentals
const carRouter = require("./cars");

const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

router.use("/:providerId/rentals/", rentalRouter); //..
router.use("/:providerId/cars/", carRouter);

router
  .route("/")
  .get(getProviders) // User
  .post(protect, authorize("admin"), createProvider); // Admin

router //คล้ายๆเดิม
  .route("/:id")
  .get(getProvider)
  .put(protect, authorize("admin"), updateProvider) // Admin
  .delete(protect, authorize("admin"), deleteProvider); // Admin

router.get("/:id/detail", getProviderDetail);

module.exports = router;
