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

router.route("/").get(getCars).post(protect, authorize("admin"), createCar);

// Public: get all bookings for cars of this provider
router.route("/bookings").get(getCarBookings);

router
  .route("/:id")
  .get(getCar)
  .put(protect, authorize("admin"), updateCar)
  .delete(protect, authorize("admin"), deleteCar);

module.exports = router;
