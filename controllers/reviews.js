const Review = require("../models/Review");
const Rental = require("../models/Rental");

// ---------- helpers ----------

async function hasCompletedRental(userId, providerId) {
  const rental = await Rental.findOne({
    user: userId,
    provider: providerId,
    paymentStatus: "paid",
    returnDate: { $lt: new Date() },
  });
  return rental;
}

// ---------- controllers ----------

//@desc  Get all reviews (admin)
//@route GET /api/reviews
//@access Admin
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate({ path: "user", select: "name" })
      .populate({ path: "provider", select: "name" })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot get reviews" });
  }
};

//@desc  Get all reviews for a provider
//@route GET /api/providers/:providerId/reviews
//@access Public
exports.getProviderReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate({ path: "user", select: "name" })
      .populate({
        path: "rental",
        select: "rentalDate returnDate car",
        populate: { path: "car", select: "brand model licensePlate image" },
      })
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot get reviews" });
  }
};

//@desc  Create review — requires completed rental with provider
//@route POST /api/providers/:providerId/reviews
//@access Private (user)
exports.createReview = async (req, res) => {
  try {
    const { rating, comment, rentalId } = req.body;

    if (!rating) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a rating" });
    }

    // Check completed rental
    const completedRental = rentalId
      ? await Rental.findOne({
          _id: rentalId,
          user: req.user.id,
          provider: req.params.providerId,
          paymentStatus: "paid",
          returnDate: { $lt: new Date() },
        })
      : await hasCompletedRental(req.user.id, req.params.providerId);

    if (!completedRental) {
      return res.status(403).json({
        success: false,
        message: "Only completed rentals can be reviewed",
      });
    }

    // Check if review already exists for this rental
    const existing = await Review.findOne({ rental: completedRental._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this rental",
      });
    }

    const review = await Review.create({
      user: req.user.id,
      provider: req.params.providerId,
      rental: completedRental._id,
      rating,
      comment,
    });

    await review.populate({ path: "user", select: "name" });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot create review" });
  }
};

//@desc  Update own review
//@route PUT /api/providers/:providerId/reviews/:reviewId
//@access Private (user)
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
      });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    if (review.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    review.rating = rating;
    review.comment = comment ?? "";
    await review.save();

    await review.populate({ path: "user", select: "name" });

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot update review" });
  }
};

//@desc  Delete review (admin only)
//@route DELETE /api/providers/:providerId/reviews/:reviewId
//@access Admin
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    // เจ้าของหรือ admin ลบได้
    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    await review.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot delete review" });
  }
};

//@desc  Check if current user can review a provider (has completed rental + not yet reviewed)
//@route GET /api/providers/:providerId/reviews/can-review
//@access Private
exports.canReview = async (req, res) => {
  try {
    const completedRentals = await Rental.find({
      user: req.user.id,
      provider: req.params.providerId,
      paymentStatus: "paid",
      returnDate: { $lt: new Date() },
    })
      .select("_id rentalDate returnDate car")
      .populate({ path: "car", select: "brand model licensePlate image" });

    if (completedRentals.length === 0) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, hasCompletedRentals: false, availableRentals: [] },
      });
    }

    // Find rentals that haven't been reviewed yet
    const reviewedRentalIds = await Review.find({
      rental: { $in: completedRentals.map((r) => r._id) },
    }).distinct("rental");

    const availableRentals = completedRentals.filter(
      (r) =>
        !reviewedRentalIds.some((id) => id.toString() === r._id.toString()),
    );

    res.status(200).json({
      success: true,
      data: { canReview: availableRentals.length > 0, hasCompletedRentals: true, availableRentals },
    });
  } catch (err) {
    console.error(err.stack);
    res
      .status(500)
      .json({ success: false, message: "Cannot check review eligibility" });
  }
};
