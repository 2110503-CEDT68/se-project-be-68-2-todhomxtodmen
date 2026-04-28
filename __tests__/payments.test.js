"use strict";
jest.mock("../models/Rental");
jest.mock("../models/Notification");
jest.mock("../controllers/rentals", () => ({
  getRentalOrFail: jest.fn(),
  isOwnerOrAdmin: jest.fn(),
  populatedRentalQuery: jest.fn(),
}));

const Rental = require("../models/Rental");
const Notification = require("../models/Notification");
const { getRentalOrFail, isOwnerOrAdmin, populatedRentalQuery } = require("../controllers/rentals");
const payments = require("../controllers/payments");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockRental(overrides = {}) {
  return {
    _id: "rental123",
    user: "user123",
    provider: "provider123",
    totalAmount: 1500,
    paymentStatus: "pending",
    refundStatus: "none",
    rentalDate: new Date(Date.now() + 10 * 86_400_000), // 10 days from now
    paidAt: null,
    save: jest.fn().mockResolvedValue(true),
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
  Notification.create = jest.fn().mockResolvedValue({});
});

// getQR
describe("getQR", () => {
  it("returns nothing when rental not found (getRentalOrFail returns null)", async () => {
    getRentalOrFail.mockResolvedValue(null);
    const req = { params: { id: "x" }, user: { id: "u1", role: "user" } };
    const res = mockRes();
    await payments.getQR(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when not owner or admin", async () => {
    getRentalOrFail.mockResolvedValue(mockRental());
    isOwnerOrAdmin.mockReturnValue(false);
    const req = { params: { id: "rental123" }, user: { id: "other", role: "user" } };
    const res = mockRes();
    await payments.getQR(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Not authorized" });
  });

  it("returns 400 when payment is not pending", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paymentStatus: "paid" }));
    isOwnerOrAdmin.mockReturnValue(true);
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.getQR(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "This rental is not pending payment" })
    );
  });

  it("returns 200 with QR URL on success", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paymentStatus: "pending" }));
    isOwnerOrAdmin.mockReturnValue(true);
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.getQR(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ url: expect.any(String) }) })
    );
  });

  it("returns 500 on unexpected error", async () => {
    getRentalOrFail.mockRejectedValue(new Error("db error"));
    const req = { params: { id: "x" }, user: { id: "u", role: "user" } };
    const res = mockRes();
    await payments.getQR(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot generate QR" });
  });
});

// getPaymentStatus
describe("getPaymentStatus", () => {
  it("returns nothing when rental not found", async () => {
    getRentalOrFail.mockResolvedValue(null);
    const req = { params: { id: "x" }, user: { id: "u", role: "user" } };
    const res = mockRes();
    await payments.getPaymentStatus(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when not owner or admin", async () => {
    getRentalOrFail.mockResolvedValue(mockRental());
    isOwnerOrAdmin.mockReturnValue(false);
    const req = { params: { id: "rental123" }, user: { id: "other", role: "user" } };
    const res = mockRes();
    await payments.getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 200 with payment data on success", async () => {
    const rental = mockRental({ paymentStatus: "paid", refundStatus: "none", totalAmount: 2000 });
    getRentalOrFail.mockResolvedValue(rental);
    isOwnerOrAdmin.mockReturnValue(true);
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { paymentStatus: "paid", refundStatus: "none", totalAmount: 2000 },
    });
  });

  it("returns 500 on unexpected error", async () => {
    getRentalOrFail.mockRejectedValue(new Error("fail"));
    const req = { params: { id: "x" }, user: { id: "u", role: "user" } };
    const res = mockRes();
    await payments.getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot get payment status" });
  });
});

// webhookPayment
describe("webhookPayment", () => {
  it("returns 400 when ref is missing", async () => {
    const req = { body: { status: "paid" } };
    const res = mockRes();
    await payments.webhookPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid webhook payload" });
  });

  it("returns 400 when status is not paid", async () => {
    const req = { body: { ref: "rental123", status: "failed" } };
    const res = mockRes();
    await payments.webhookPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid webhook payload" });
  });

  it("returns 404 when rental not found in DB", async () => {
    Rental.findById = jest.fn().mockResolvedValue(null);
    const req = { body: { ref: "rental123", status: "paid" } };
    const res = mockRes();
    await payments.webhookPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Rental not found" });
  });

  it("returns 400 when rental is not pending", async () => {
    Rental.findById = jest.fn().mockResolvedValue(mockRental({ paymentStatus: "paid" }));
    const req = { body: { ref: "rental123", status: "paid" } };
    const res = mockRes();
    await payments.webhookPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Rental is not pending payment" });
  });

  it("returns 200 and marks rental as paid on success", async () => {
    const rental = mockRental({ paymentStatus: "pending" });
    Rental.findById = jest.fn().mockResolvedValue(rental);
    const req = { body: { ref: "rental123", status: "paid" } };
    const res = mockRes();
    await payments.webhookPayment(req, res);
    expect(rental.paymentStatus).toBe("paid");
    expect(rental.save).toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("returns 500 on unexpected error", async () => {
    Rental.findById = jest.fn().mockRejectedValue(new Error("db fail"));
    const req = { body: { ref: "rental123", status: "paid" } };
    const res = mockRes();
    await payments.webhookPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Webhook processing failed" });
  });
});

// getReceipt
describe("getReceipt", () => {
  it("returns 404 when rental not found", async () => {
    populatedRentalQuery.mockResolvedValue(null);
    Rental.findById = jest.fn().mockReturnValue({ then: jest.fn() });
    const req = { params: { id: "x" }, user: { id: "u", role: "user" } };
    const res = mockRes();
    await payments.getReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 401 when user object _id does not match and not admin", async () => {
    const rental = {
      user: { _id: { toString: () => "otherUser" } },
      paymentStatus: "paid",
    };
    populatedRentalQuery.mockResolvedValue(rental);
    Rental.findById = jest.fn().mockReturnValue({});
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.getReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Not authorized" });
  });

  it("handles string user field for owner check", async () => {
    const rental = {
      user: "user123",  // actual string — takes the else branch in typeof check
      paymentStatus: "paid",
    };
    populatedRentalQuery.mockResolvedValue(rental);
    Rental.findById = jest.fn().mockReturnValue({});
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.getReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 when payment not completed", async () => {
    const rental = {
      user: { _id: { toString: () => "user123" } },
      paymentStatus: "pending",
    };
    populatedRentalQuery.mockResolvedValue(rental);
    Rental.findById = jest.fn().mockReturnValue({});
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.getReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Payment not completed" });
  });

  it("returns 200 with rental data on success", async () => {
    const rental = {
      user: { _id: { toString: () => "user123" } },
      paymentStatus: "paid",
    };
    populatedRentalQuery.mockResolvedValue(rental);
    Rental.findById = jest.fn().mockReturnValue({});
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.getReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: rental });
  });

  it("allows admin to view any receipt", async () => {
    const rental = {
      user: { _id: { toString: () => "otherUser" } },
      paymentStatus: "paid",
    };
    populatedRentalQuery.mockResolvedValue(rental);
    Rental.findById = jest.fn().mockReturnValue({});
    const req = { params: { id: "rental123" }, user: { id: "admin1", role: "admin" } };
    const res = mockRes();
    await payments.getReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 500 on unexpected error", async () => {
    populatedRentalQuery.mockRejectedValue(new Error("fail"));
    Rental.findById = jest.fn().mockReturnValue({});
    const req = { params: { id: "x" }, user: { id: "u", role: "user" } };
    const res = mockRes();
    await payments.getReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot get receipt" });
  });
});

// updatePaymentStatus
describe("updatePaymentStatus", () => {
  beforeEach(() => {
    Rental.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    Rental.findById = jest.fn().mockResolvedValue(mockRental({ paymentStatus: "paid" }));
  });

  it("returns nothing when rental not found", async () => {
    getRentalOrFail.mockResolvedValue(null);
    const req = { params: { id: "x" }, body: {}, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("sets paidAt when paymentStatus is paid and paidAt is null", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paidAt: null }));
    const req = { params: { id: "rental123" }, body: { paymentStatus: "paid" }, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(Notification.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does not set paidAt when rental already has paidAt", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paidAt: new Date() }));
    const req = { params: { id: "rental123" }, body: { paymentStatus: "paid" }, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(Notification.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("handles paymentStatus that is not paid", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paidAt: null }));
    const req = { params: { id: "rental123" }, body: { paymentStatus: "pending" }, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(Notification.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("sets refundStatus completed → payment refunded + notification", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paidAt: new Date() }));
    const req = { params: { id: "rental123" }, body: { refundStatus: "completed" }, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(Notification.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("sets refundStatus requested → notification", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paidAt: new Date() }));
    const req = { params: { id: "rental123" }, body: { refundStatus: "requested" }, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(Notification.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("sets refundStatus to other value → no notification from refund branch", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paidAt: new Date() }));
    const req = { params: { id: "rental123" }, body: { refundStatus: "none" }, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(Notification.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 500 on unexpected error", async () => {
    getRentalOrFail.mockRejectedValue(new Error("fail"));
    const req = { params: { id: "x" }, body: {}, user: {} };
    const res = mockRes();
    await payments.updatePaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot update payment status" });
  });
});

// cancelRental
describe("cancelRental", () => {
  it("returns nothing when rental not found", async () => {
    getRentalOrFail.mockResolvedValue(null);
    const req = { params: { id: "x" }, user: { id: "u", role: "user" } };
    const res = mockRes();
    await payments.cancelRental(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when not owner or admin", async () => {
    getRentalOrFail.mockResolvedValue(mockRental());
    isOwnerOrAdmin.mockReturnValue(false);
    const req = { params: { id: "rental123" }, user: { id: "other", role: "user" } };
    const res = mockRes();
    await payments.cancelRental(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when already refunded", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paymentStatus: "refunded", refundStatus: "none" }));
    isOwnerOrAdmin.mockReturnValue(true);
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.cancelRental(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "This rental is already cancelled" });
  });

  it("returns 400 when refundStatus is not none", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({ paymentStatus: "paid", refundStatus: "requested" }));
    isOwnerOrAdmin.mockReturnValue(true);
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.cancelRental(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "This rental is already cancelled" });
  });

  it("returns 400 when pickup is fewer than 3 days away", async () => {
    getRentalOrFail.mockResolvedValue(mockRental({
      rentalDate: new Date(Date.now() + 1 * 86_400_000), // 1 day from now
    }));
    isOwnerOrAdmin.mockReturnValue(true);
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.cancelRental(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining("3 days") })
    );
  });

  it("cancels rental and sends notification when ≥ 3 days before pickup", async () => {
    const rental = mockRental({
      rentalDate: new Date(Date.now() + 5 * 86_400_000),
      totalAmount: 3000,
    });
    getRentalOrFail.mockResolvedValue(rental);
    isOwnerOrAdmin.mockReturnValue(true);
    const req = { params: { id: "rental123" }, user: { id: "user123", role: "user" } };
    const res = mockRes();
    await payments.cancelRental(req, res);
    expect(rental.refundStatus).toBe("requested");
    expect(rental.save).toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 500 on unexpected error", async () => {
    getRentalOrFail.mockRejectedValue(new Error("fail"));
    const req = { params: { id: "x" }, user: { id: "u", role: "user" } };
    const res = mockRes();
    await payments.cancelRental(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot cancel rental" });
  });
});
