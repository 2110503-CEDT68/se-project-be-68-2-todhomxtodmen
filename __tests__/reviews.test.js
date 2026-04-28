"use strict";

jest.mock("../models/Review");
jest.mock("../models/Rental");

const Review = require("../models/Review");
const Rental = require("../models/Rental");
const reviews = require("../controllers/reviews");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReview(overrides = {}) {
  return {
    _id: "review123",
    user: { toString: () => "user123" },
    provider: "provider123",
    rental: "rental123",
    rating: 4,
    comment: "Great!",
    deleteOne: jest.fn().mockResolvedValue({}),
    populate: jest.fn().mockResolvedValue({}),
    save: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeRental(overrides = {}) {
  return {
    _id: "rental123",
    user: "user123",
    provider: "provider123",
    paymentStatus: "paid",
    returnDate: new Date(Date.now() - 86_400_000), // yesterday
    ...overrides,
  };
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// getAllReviews
describe("getAllReviews", () => {
  it("returns 200 with all reviews", async () => {
    const reviewList = [makeReview(), makeReview()];
    const chain = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(reviewList) };
    Review.find = jest.fn().mockReturnValue(chain);
    const req = {};
    const res = mockRes();
    await reviews.getAllReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, count: 2, data: reviewList });
  });

  it("returns 500 on error", async () => {
    Review.find = jest.fn().mockImplementation(() => { throw new Error("fail"); });
    const req = {};
    const res = mockRes();
    await reviews.getAllReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot get reviews" });
  });
});

// getProviderReviews
describe("getProviderReviews", () => {
  it("returns 200 with reviews for a provider", async () => {
    const reviewList = [makeReview()];
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(reviewList),
    };
    Review.find = jest.fn().mockReturnValue(chain);
    const req = { params: { providerId: "provider123" } };
    const res = mockRes();
    await reviews.getProviderReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, data: reviewList });
  });

  it("returns 500 on error", async () => {
    Review.find = jest.fn().mockImplementation(() => { throw new Error("fail"); });
    const req = { params: { providerId: "provider123" } };
    const res = mockRes();
    await reviews.getProviderReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot get reviews" });
  });
});

// createReview
describe("createReview", () => {
  it("returns 400 when no rating is provided", async () => {
    const req = { body: { comment: "nice" }, params: { providerId: "p1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.createReview(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Please provide a rating" });
  });

  it("returns 403 when no completed rental exists (with rentalId)", async () => {
    Rental.findOne = jest.fn().mockResolvedValue(null);
    const req = {
      body: { rating: 5, rentalId: "rental123" },
      params: { providerId: "p1" },
      user: { id: "u1" },
    };
    const res = mockRes();
    await reviews.createReview(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Only completed rentals can be reviewed",
    });
  });

  it("returns 403 when no completed rental via hasCompletedRental (no rentalId)", async () => {
    Rental.findOne = jest.fn().mockResolvedValue(null);
    const req = {
      body: { rating: 4 },
      params: { providerId: "p1" },
      user: { id: "u1" },
    };
    const res = mockRes();
    await reviews.createReview(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 400 when review already exists for this rental", async () => {
    Rental.findOne = jest.fn().mockResolvedValue(makeRental());
    Review.findOne = jest.fn().mockResolvedValue(makeReview());
    const req = {
      body: { rating: 4, rentalId: "rental123" },
      params: { providerId: "p1" },
      user: { id: "u1" },
    };
    const res = mockRes();
    await reviews.createReview(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You have already reviewed this rental",
    });
  });

  it("creates a review and returns 201", async () => {
    Rental.findOne = jest.fn().mockResolvedValue(makeRental());
    Review.findOne = jest.fn().mockResolvedValue(null);
    const created = makeReview();
    Review.create = jest.fn().mockResolvedValue(created);
    const req = {
      body: { rating: 5, comment: "Excellent!", rentalId: "rental123" },
      params: { providerId: "provider123" },
      user: { id: "user123" },
    };
    const res = mockRes();
    await reviews.createReview(req, res);
    expect(Review.create).toHaveBeenCalled();
    expect(created.populate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 500 on unexpected error", async () => {
    Rental.findOne = jest.fn().mockRejectedValue(new Error("fail"));
    const req = {
      body: { rating: 5, rentalId: "rental123" },
      params: { providerId: "p1" },
      user: { id: "u1" },
    };
    const res = mockRes();
    await reviews.createReview(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot create review" });
  });
});

// updateReview
describe("updateReview", () => {
  it("returns 400 when rating is not provided", async () => {
    const req = { body: { comment: "ok" }, params: { reviewId: "rev1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.updateReview(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Rating is required" });
  });

  it("returns 404 when review not found", async () => {
    Review.findById = jest.fn().mockResolvedValue(null);
    const req = { body: { rating: 3 }, params: { reviewId: "rev1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.updateReview(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Review not found" });
  });

  it("returns 401 when user is not the review owner", async () => {
    Review.findById = jest.fn().mockResolvedValue(makeReview({ user: { toString: () => "anotherUser" } }));
    const req = { body: { rating: 3 }, params: { reviewId: "rev1" }, user: { id: "user123" } };
    const res = mockRes();
    await reviews.updateReview(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Not authorized" });
  });

  it("updates review and returns 200", async () => {
    const review = makeReview();
    Review.findById = jest.fn().mockResolvedValue(review);
    const req = {
      body: { rating: 5, comment: "Updated!" },
      params: { reviewId: "review123" },
      user: { id: "user123" },
    };
    const res = mockRes();
    await reviews.updateReview(req, res);
    expect(review.rating).toBe(5);
    expect(review.comment).toBe("Updated!");
    expect(review.save).toHaveBeenCalled();
    expect(review.populate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("sets comment to empty string when comment is not provided", async () => {
    const review = makeReview();
    Review.findById = jest.fn().mockResolvedValue(review);
    const req = {
      body: { rating: 3 },
      params: { reviewId: "review123" },
      user: { id: "user123" },
    };
    const res = mockRes();
    await reviews.updateReview(req, res);
    expect(review.comment).toBe("");
  });

  it("returns 500 on unexpected error", async () => {
    Review.findById = jest.fn().mockRejectedValue(new Error("fail"));
    const req = { body: { rating: 4 }, params: { reviewId: "rev1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.updateReview(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot update review" });
  });
});

// deleteReview
describe("deleteReview", () => {
  it("returns 404 when review not found", async () => {
    Review.findById = jest.fn().mockResolvedValue(null);
    const req = { params: { reviewId: "rev1" }, user: { id: "u1", role: "user" } };
    const res = mockRes();
    await reviews.deleteReview(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Review not found" });
  });

  it("returns 401 when user is neither owner nor admin", async () => {
    Review.findById = jest.fn().mockResolvedValue(makeReview({ user: { toString: () => "other" } }));
    const req = { params: { reviewId: "rev1" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await reviews.deleteReview(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Not authorized" });
  });

  it("allows owner to delete their own review", async () => {
    const review = makeReview();
    Review.findById = jest.fn().mockResolvedValue(review);
    const req = { params: { reviewId: "review123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await reviews.deleteReview(req, res);
    expect(review.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });

  it("allows admin to delete any review", async () => {
    const review = makeReview({ user: { toString: () => "other" } });
    Review.findById = jest.fn().mockResolvedValue(review);
    const req = { params: { reviewId: "review123" }, user: { id: "admin1", role: "admin" } };
    const res = mockRes();
    await reviews.deleteReview(req, res);
    expect(review.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 500 on unexpected error", async () => {
    Review.findById = jest.fn().mockRejectedValue(new Error("fail"));
    const req = { params: { reviewId: "rev1" }, user: { id: "u1", role: "user" } };
    const res = mockRes();
    await reviews.deleteReview(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot delete review" });
  });
});

// canReview
describe("canReview", () => {
  it("returns canReview: false when no completed rentals", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([]),
    };
    Rental.find = jest.fn().mockReturnValue(chain);
    const req = { params: { providerId: "p1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.canReview(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { canReview: false, hasCompletedRentals: false, availableRentals: [] },
    });
  });

  it("returns canReview: true when some rentals have not been reviewed", async () => {
    const rental1 = makeRental({ _id: "r1" });
    rental1._id = { toString: () => "r1" };
    const rental2 = makeRental({ _id: "r2" });
    rental2._id = { toString: () => "r2" };
    const chain = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([rental1, rental2]),
    };
    Rental.find = jest.fn().mockReturnValue(chain);
    // Only rental1 has been reviewed
    Review.find = jest.fn().mockReturnValue({
      distinct: jest.fn().mockResolvedValue([{ toString: () => "r1" }]),
    });
    const req = { params: { providerId: "p1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.canReview(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.data.canReview).toBe(true);
    expect(responseData.data.hasCompletedRentals).toBe(true);
    expect(responseData.data.availableRentals).toHaveLength(1);
  });

  it("returns canReview: false when all rentals are already reviewed", async () => {
    const rental1 = makeRental({ _id: "r1" });
    rental1._id = { toString: () => "r1" };
    const chain = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([rental1]),
    };
    Rental.find = jest.fn().mockReturnValue(chain);
    Review.find = jest.fn().mockReturnValue({
      distinct: jest.fn().mockResolvedValue([{ toString: () => "r1" }]),
    });
    const req = { params: { providerId: "p1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.canReview(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.data.canReview).toBe(false);
    expect(responseData.data.hasCompletedRentals).toBe(true);
  });

  it("returns 500 on unexpected error", async () => {
    Rental.find = jest.fn().mockImplementation(() => { throw new Error("fail"); });
    const req = { params: { providerId: "p1" }, user: { id: "u1" } };
    const res = mockRes();
    await reviews.canReview(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Cannot check review eligibility",
    });
  });
});
