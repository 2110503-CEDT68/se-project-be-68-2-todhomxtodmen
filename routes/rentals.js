const express = require("express");
const {
  getRentals,
  getRental,
  addRental,
  updateRental,
  deleteRental,
} = require("../controllers/rentals");


const router = express.Router({ mergeParams: true });

const { protect, authorize } = require("../middleware/auth");

router
  .route("/")
  .get(protect, getRentals) // ดูรายการจอง
  .post(protect, authorize("user", "admin"), addRental); //การจองรถ

router
  .route("/:id")
  .get(protect, getRental)
  .put(protect, authorize("user", "admin"), updateRental) //แก้ไขการจอง
  .delete(protect, authorize("user", "admin"), deleteRental); // ลบการจอง

module.exports = router;