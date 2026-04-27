const mongoose = require("mongoose");

const RentalSchema = new mongoose.Schema({
  rentalDate: {
    type: Date,
    required: [true, "Please add a pickup date"],
  },
  returnDate: {
    type: Date,
    required: [true, "Please add a return date"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  provider: {
    type: mongoose.Schema.ObjectId,
    ref: "Provider",
    required: true,
  },
  car: {
    type: mongoose.Schema.ObjectId,
    ref: "Car",
    required: true,
  },
  // --- Payment fields ---
  totalAmount: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending",
  },
  refundStatus: {
    type: String,
    enum: ["none", "requested", "completed"],
    default: "none",
  },
  paidAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  createAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for common query patterns
RentalSchema.index({ user: 1, returnDate: 1 });                              // getRentals, rental limit count, auto-expire
RentalSchema.index({ provider: 1 });                                         // provider detail bookings fetch
RentalSchema.index({ car: 1, paymentStatus: 1, rentalDate: 1, returnDate: 1 }); // overlap conflict check

module.exports = mongoose.model("Rental", RentalSchema);
