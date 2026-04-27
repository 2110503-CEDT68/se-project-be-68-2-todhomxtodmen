const Car = require("../models/Car");
const Provider = require("../models/Provider");
const Rental = require("../models/Rental");

//@desc Get bookings for all cars of a provider (public - no auth)
//@route GET /api/providers/:providerId/cars/bookings
//@access Public
exports.getCarBookings = async (req, res, next) => {
  try {
    // Find all cars of this provider
    const cars = await Car.find({ provider: req.params.providerId }).select(
      "_id",
    );
    const carIds = cars.map((c) => c._id);

    // Find all rentals for those cars (only future/current)
    const bookings = await Rental.find({
      car: { $in: carIds },
      returnDate: { $gte: new Date() },
    }).select("car rentalDate returnDate -_id");

    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot fetch bookings" });
  }
};

//@desc Get all cars
//@route GET /api/cars
//@route GET /api/providers/:providerId/cars
//@access Public
exports.getCars = async (req, res, next) => {
  let query;

  if (req.params.providerId) {
    query = Car.find({ provider: req.params.providerId }).populate({
      path: "provider",
      select: "name address telephone",
    });
  } else {
    query = Car.find().populate({
      path: "provider",
      select: "name address telephone",
    });
  }

  try {
    const cars = await query;
    res.status(200).json({ success: true, count: cars.length, data: cars });
  } catch (err) {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find cars" });
  }
};

//@desc Get single car
//@route GET /api/cars/:id
//@access Public
exports.getCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id).populate({
      path: "provider",
      select: "name address telephone",
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car with the id of ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: car });
  } catch (err) {
    console.log(err.stack);
    return res.status(500).json({ success: false, message: "Cannot find car" });
  }
};

//@desc Add car to provider
//@route POST /api/providers/:providerId/cars
//@access Private (Admin)
exports.createCar = async (req, res, next) => {
  try {
    req.body.provider = req.params.providerId;

    const provider = await Provider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: `No provider with the id of ${req.params.providerId}`,
      });
    }

    const car = await Car.create(req.body);
    res.status(201).json({ success: true, data: car });
  } catch (err) {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot create car" });
  }
};

//@desc Update car
//@route PUT /api/cars/:id
//@access Private (Admin)
exports.updateCar = async (req, res, next) => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car with the id of ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: car });
  } catch (err) {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot update car" });
  }
};

//@desc Delete car
//@route DELETE /api/cars/:id
//@access Private (Admin)
exports.deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car with the id of ${req.params.id}`,
      });
    }

    await Car.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot delete car" });
  }
};
