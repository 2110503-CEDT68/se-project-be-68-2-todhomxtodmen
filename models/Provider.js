const mongoose = require("mongoose");

const ProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      unique: true,
      trim: true,
      maxlength: [50, "Name can not be more than 50 characters"],
    },
    address: {
      type: String,
      required: [true, "Please add an address"],
    },
    telephone: {
      type: String,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ProviderSchema.virtual("rentals", {
  ref: "Rental",
  localField: "_id",
  foreignField: "provider",
  justOne: false,
});

ProviderSchema.virtual("cars", {
  ref: "Car",
  localField: "_id",
  foreignField: "provider",
  justOne: false,
});

module.exports = mongoose.model("Provider", ProviderSchema);
