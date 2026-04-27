const mongoose = require("mongoose");

const CarSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: [true, "Please add a brand"],
      trim: true,
      maxlength: [50, "Brand can not be more than 50 characters"],
    },
    model: {
      type: String,
      required: [true, "Please add a model"],
      trim: true,
      maxlength: [50, "Model can not be more than 50 characters"],
    },
    color: {
      type: String,
      required: [true, "Please add a color"],
      trim: true,
    },
    licensePlate: {
      type: String,
      required: [true, "Please add a license plate"],
      unique: true,
      trim: true,
    },
    dailyRate: {
      type: Number,
      required: [true, "Please add a daily rate"],
    },
    available: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
    },
    provider: {
      type: mongoose.Schema.ObjectId,
      ref: "Provider",
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CarSchema.index({ provider: 1 });

module.exports = mongoose.model("Car", CarSchema);
