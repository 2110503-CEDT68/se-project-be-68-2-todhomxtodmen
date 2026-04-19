const Rental = require("../models/Rental");
const Provider = require("../models/Provider");
const Car = require("../models/Car");

const carSelect =
  "brand model year color licensePlate dailyRate available image";

//@desc Get all rentals
//@route GET /api/rentals
//@access Private
exports.getRentals = async (req, res, next) => {
  let query;
  if (req.user.role !== "admin") {
    query = Rental.find({ user: req.user.id })
      .populate({ path: "provider", select: "name address telephone" })
      .populate({ path: "user", select: "name email telephone" })
      .populate({ path: "car", select: carSelect });
  } else {
    if (req.params.providerId) {
      query = Rental.find({ provider: req.params.providerId })
        .populate({ path: "provider", select: "name address telephone" })
        .populate({ path: "user", select: "name email telephone" })
        .populate({ path: "car", select: carSelect });
    } else {
      query = Rental.find()
        .populate({ path: "provider", select: "name address telephone" })
        .populate({ path: "user", select: "name email telephone" })
        .populate({ path: "car", select: carSelect });
    }
  }
  try {
    const rentals = await query;
    res
      .status(200)
      .json({ success: true, count: rentals.length, data: rentals });
  } catch (err) {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find rental" });
  }
};

//@desc Get single rental
//@route GET /api/rentals/:id
//@access Private
exports.getRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate({ path: "provider", select: "name address telephone" })
      .populate({ path: "user", select: "name email telephone" })
      .populate({ path: "car", select: carSelect });

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: `No rental with the id of ${req.params.id}`,
      });
    }
    res.status(200).json({ success: true, data: rental });
  } catch (error) {
    console.log(error.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Rental" });
  }
};

//@desc Add rental
//@route POST /api/rentals
//@access Private
exports.addRental = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.body.provider);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: `No provider with the id of ${req.body.provider}`,
      });
    }

    // Check if car exists and belongs to the provider
    const car = await Car.findById(req.body.car);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car with the id of ${req.body.car}`,
      });
    }
    if (car.provider.toString() !== req.body.provider) {
      return res.status(400).json({
        success: false,
        message: `Car does not belong to this provider`,
      });
    }

    // Check car is not manually set unavailable by admin
    if (!car.available) {
      return res
        .status(400)
        .json({ success: false, message: "This car is currently unavailable" });
    }

    // Validate dates
    const pickupDate = new Date(req.body.rentalDate);
    const returnDate = new Date(req.body.returnDate);

    if (returnDate <= pickupDate) {
      return res.status(400).json({
        success: false,
        message: "Return date must be after pickup date",
      });
    }

    // Check for overlapping rentals on the same car
    const overlapping = await Rental.findOne({
      car: req.body.car,
      rentalDate: { $lt: returnDate },
      returnDate: { $gt: pickupDate },
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `This car is already booked from ${overlapping.rentalDate.toISOString().split("T")[0]} to ${overlapping.returnDate.toISOString().split("T")[0]}`,
      });
    }

    // Add user ID
    req.body.user = req.user.id;

    // Check max 3 rentals for non-admin
    const existedRentals = await Rental.find({ user: req.user.id });
    if (existedRentals.length >= 3 && req.user.role !== "admin") {
      return res
        .status(400)
        .json({ success: false, message: `You have already made 3 rentals` });
    }

    const rental = await Rental.create(req.body);
    res.status(200).json({ success: true, data: rental });
  } catch (error) {
    console.log(error.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot create rental" });
  }
};

//@desc Update rental
//@route PUT /api/rentals/:id
//@access Private
exports.updateRental = async (req, res, next) => {
  try {
    let rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({
        success: false,
        message: `No rental with id ${req.params.id}`,
      });
    }
    if (rental.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `Not authorized to update this rental`,
      });
    }

    // If dates are being updated, validate and check overlap
    if (req.body.rentalDate || req.body.returnDate) {
      const pickupDate = new Date(req.body.rentalDate || rental.rentalDate);
      const returnDate = new Date(req.body.returnDate || rental.returnDate);

      if (returnDate <= pickupDate) {
        return res.status(400).json({
          success: false,
          message: "Return date must be after pickup date",
        });
      }

      const overlapping = await Rental.findOne({
        car: rental.car,
        _id: { $ne: rental._id },
        rentalDate: { $lt: returnDate },
        returnDate: { $gt: pickupDate },
      });

      if (overlapping) {
        return res.status(400).json({
          success: false,
          message: `Car is booked from ${overlapping.rentalDate.toISOString().split("T")[0]} to ${overlapping.returnDate.toISOString().split("T")[0]}`,
        });
      }
    }

    rental = await Rental.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: rental });
  } catch (error) {
    console.log(error.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot update rental" });
  }
};

//@desc Delete rental
//@route DELETE /api/rentals/:id
//@access Private
exports.deleteRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({
        success: false,
        message: `No rental with id ${req.params.id}`,
      });
    }
    if (rental.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `Not authorized to delete this rental`,
      });
    }
    await rental.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.log(error.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot delete rental" });
  }
};

//@desc Check car availability for date range
//@route GET /api/cars/:id/availability?pickupDate=xxx&returnDate=xxx
//@access Public
exports.checkCarAvailability = async (req, res, next) => {
  try {
    const { pickupDate, returnDate } = req.query;
    if (!pickupDate || !returnDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide pickupDate and returnDate",
      });
    }

    const overlapping = await Rental.find({
      car: req.params.id,
      rentalDate: { $lt: new Date(returnDate) },
      returnDate: { $gt: new Date(pickupDate) },
    });

    res.status(200).json({
      success: true,
      available: overlapping.length === 0,
      bookings: overlapping.map((r) => ({
        rentalDate: r.rentalDate,
        returnDate: r.returnDate,
      })),
    });
  } catch (error) {
    console.log(error.stack);
    return res
      .status(500)
      .json({ success: false, message: "Error checking availability" });
  }
};
