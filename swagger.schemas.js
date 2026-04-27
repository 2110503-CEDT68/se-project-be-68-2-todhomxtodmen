module.exports = {
  User: {
    type: "object",
    properties: {
      _id:       { type: "string", example: "664a1b2c3d4e5f6789012345" },
      name:      { type: "string", example: "John Doe" },
      email:     { type: "string", format: "email", example: "john@example.com" },
      role:      { type: "string", enum: ["user", "admin"], example: "user" },
      telephone: { type: "string", example: "0812345678" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Provider: {
    type: "object",
    properties: {
      _id:         { type: "string", example: "664a1b2c3d4e5f6789012345" },
      name:        { type: "string", example: "Bangkok Car Rental" },
      address:     { type: "string", example: "123 Sukhumvit Rd, Bangkok" },
      telephone:   { type: "string", example: "0212345678" },
      avgRating:   { type: "number", example: 4.5 },
      reviewCount: { type: "integer", example: 12 },
    },
  },

  Car: {
    type: "object",
    properties: {
      _id:          { type: "string", example: "664a1b2c3d4e5f6789012346" },
      brand:        { type: "string", example: "Toyota" },
      model:        { type: "string", example: "Camry" },
      color:        { type: "string", example: "White" },
      licensePlate: { type: "string", example: "กข 1234" },
      dailyRate:    { type: "number", example: 1200 },
      available:    { type: "boolean", example: true },
      image:        { type: "string", example: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80" },
      provider:     { type: "string", example: "664a1b2c3d4e5f6789012345" },
    },
  },

  Rental: {
    type: "object",
    properties: {
      _id:           { type: "string", example: "664a1b2c3d4e5f6789012347" },
      rentalDate:    { type: "string", format: "date", example: "2025-06-01" },
      returnDate:    { type: "string", format: "date", example: "2025-06-05" },
      user:          { type: "string", example: "664a1b2c3d4e5f6789012345" },
      provider:      { type: "string", example: "664a1b2c3d4e5f6789012345" },
      car:           { type: "string", example: "664a1b2c3d4e5f6789012346" },
      totalAmount:   { type: "number", example: 4800 },
      paymentStatus: { type: "string", enum: ["pending", "paid", "refunded"], example: "pending" },
      refundStatus:  { type: "string", enum: ["none", "requested", "completed"], example: "none" },
      paidAt:        { type: "string", format: "date-time" },
      cancelledAt:   { type: "string", format: "date-time" },
      createAt:      { type: "string", format: "date-time" },
    },
  },

  Review: {
    type: "object",
    properties: {
      _id:       { type: "string", example: "664a1b2c3d4e5f6789012348" },
      user:      { type: "string", example: "664a1b2c3d4e5f6789012345" },
      provider:  { type: "string", example: "664a1b2c3d4e5f6789012345" },
      rental:    { type: "string", example: "664a1b2c3d4e5f6789012347" },
      rating:    { type: "integer", minimum: 1, maximum: 5, example: 5 },
      comment:   { type: "string", example: "Great service!" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Notification: {
    type: "object",
    properties: {
      _id:       { type: "string", example: "664a1b2c3d4e5f6789012349" },
      user:      { type: "string", example: "664a1b2c3d4e5f6789012345" },
      rental:    { type: "string", example: "664a1b2c3d4e5f6789012347" },
      message:   { type: "string", example: "Your payment has been confirmed." },
      read:      { type: "boolean", example: false },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  ApiResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      count:   { type: "integer" },
      data:    { },
      message: { type: "string" },
    },
  },

  Error: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Error description" },
    },
  },
};
