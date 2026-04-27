const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
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
  rental: {
    type: mongoose.Schema.ObjectId,
    ref: "Rental",
    required: true,
  },
  rating: {
    type: Number,
    required: [true, "Please provide a rating"],
    min: [1, "Rating must be at least 1"],
    max: [5, "Rating cannot exceed 5"],
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, "Comment cannot exceed 500 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// One review per rental
ReviewSchema.index({ rental: 1 }, { unique: true });
ReviewSchema.index({ provider: 1, createdAt: -1 });

// Static method to calculate average rating for a provider
ReviewSchema.statics.calcAverageRating = async function (providerId) {
  const result = await this.aggregate([
    { $match: { provider: mongoose.Types.ObjectId.createFromHexString(providerId.toString()) } },
    { $group: { _id: "$provider", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  if (result.length > 0) {
    await mongoose.model("Provider").findByIdAndUpdate(providerId, {
      avgRating: Math.round(result[0].avgRating * 10) / 10,
      reviewCount: result[0].count,
    });
  } else {
    await mongoose.model("Provider").findByIdAndUpdate(providerId, {
      avgRating: 0,
      reviewCount: 0,
    });
  }
};

ReviewSchema.post("save", function () {
  this.constructor.calcAverageRating(this.provider);
});

ReviewSchema.post("deleteOne", { document: true, query: false }, function () {
  this.constructor.calcAverageRating(this.provider);
});

module.exports = mongoose.model("Review", ReviewSchema);
