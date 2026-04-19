const Rental = require("../models/Rental");
const Provider = require("../models/Provider");
const Car = require("../models/Car");

const CAR_SELECT =
  "brand model year color licensePlate dailyRate available image";

// ---------- shared helpers ----------

function populatedRentalQuery(query) {
  return query
    .populate({ path: "provider", select: "name address telephone" })
    .populate({ path: "user", select: "name email telephone" })
    .populate({ path: "car", select: CAR_SELECT });
}

async function getRentalOrFail(id, res) {
  const rental = await Rental.findById(id);
  if (!rental) {
    res.status(404).json({
      success: false,
      message: `No rental with the id of ${id}`,
    });
    return null;
  }
  return rental;
}

function isOwnerOrAdmin(rental, user) {
  return rental.user.toString() === user.id || user.role === "admin";
}

function calcTotalAmount(car, rentalDate, returnDate) {
  const days = Math.max(
    1,
    Math.ceil((new Date(returnDate) - new Date(rentalDate)) / 86_400_000)
  );
  return car.dailyRate * days;
}

// ---------- exported helpers (used by payments controller) ----------

exports.populatedRentalQuery = populatedRentalQuery;
exports.getRentalOrFail = getRentalOrFail;
exports.isOwnerOrAdmin = isOwnerOrAdmin;

// ---------- controllers ----------

//@desc  Get all rentals (admin sees all, user sees own)
//@route GET /api/rentals
//@access Private
exports.getRentals = async (req, res) => {
  try {
    let baseQuery;
    if (req.user.role !== "admin") {
      baseQuery = Rental.find({ user: req.user.id });
    } else if (req.params.providerId) {
      baseQuery = Rental.find({ provider: req.params.providerId });
    } else {
      baseQuery = Rental.find();
    }

    const rentals = await populatedRentalQuery(baseQuery);
    res.status(200).json({ success: true, count: rentals.length, data: rentals });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot find rentals" });
  }
};

//@desc  Get single rental
//@route GET /api/rentals/:id
//@access Private
exports.getRental = async (req, res) => {
  try {
    const rental = await populatedRentalQuery(Rental.findById(req.params.id));
    if (!rental) {
      return res.status(404).json({
        success: false,
        message: `No rental with the id of ${req.params.id}`,
      });
    }
    res.status(200).json({ success: true, data: rental });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot find rental" });
  }
};

//@desc  Add rental — calculates totalAmount automatically
//@route POST /api/rentals
//@access Private
exports.addRental = async (req, res) => {
  try {
    const provider = await Provider.findById(req.body.provider);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: `No provider with the id of ${req.body.provider}`,
      });
    }

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
        message: "Car does not belong to this provider",
      });
    }
    if (!car.available) {
      return res.status(400).json({
        success: false,
        message: "This car is currently unavailable",
      });
    }

    const pickupDate = new Date(req.body.rentalDate);
    const returnDate = new Date(req.body.returnDate);

    if (returnDate <= pickupDate) {
      return res.status(400).json({
        success: false,
        message: "Return date must be after pickup date",
      });
    }

    const overlapping = await Rental.findOne({
      car: req.body.car,
      paymentStatus: { $ne: "refunded" },
      rentalDate: { $lt: returnDate },
      returnDate: { $gt: pickupDate },
    });
    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `This car is already booked from ${
          overlapping.rentalDate.toISOString().split("T")[0]
        } to ${overlapping.returnDate.toISOString().split("T")[0]}`,
      });
    }

    if (req.user.role !== "admin") {
      const existingCount = await Rental.countDocuments({ user: req.user.id });
      if (existingCount >= 3) {
        return res.status(400).json({
          success: false,
          message: "You have already made 3 rentals",
        });
      }
    }

    const totalAmount = calcTotalAmount(car, pickupDate, returnDate);

    const rental = await Rental.create({
      ...req.body,
      user: req.user.id,
      totalAmount,
    });

    res.status(200).json({ success: true, data: rental });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot create rental" });
  }
};

//@desc  Update rental dates
//@route PUT /api/rentals/:id
//@access Private
exports.updateRental = async (req, res) => {
  try {
    let rental = await getRentalOrFail(req.params.id, res);
    if (!rental) return;

    if (!isOwnerOrAdmin(rental, req.user)) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this rental",
      });
    }

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
        paymentStatus: { $ne: "refunded" },
        rentalDate: { $lt: returnDate },
        returnDate: { $gt: pickupDate },
      });
      if (overlapping) {
        return res.status(400).json({
          success: false,
          message: `Car is booked from ${
            overlapping.rentalDate.toISOString().split("T")[0]
          } to ${overlapping.returnDate.toISOString().split("T")[0]}`,
        });
      }

      if (rental.paymentStatus === "pending") {
        const car = await Car.findById(rental.car);
        req.body.totalAmount = calcTotalAmount(car, pickupDate, returnDate);
      }
    }

    rental = await Rental.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: rental });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot update rental" });
  }
};

//@desc  Delete rental
//@route DELETE /api/rentals/:id
//@access Private
exports.deleteRental = async (req, res) => {
  try {
    const rental = await getRentalOrFail(req.params.id, res);
    if (!rental) return;

    if (!isOwnerOrAdmin(rental, req.user)) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this rental",
      });
    }

    await rental.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Cannot delete rental" });
  }
};

//@desc  Check car availability for date range
//@route GET /api/cars/:id/availability
//@access Public
exports.checkCarAvailability = async (req, res) => {
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
      paymentStatus: { $ne: "refunded" },
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
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Error checking availability" });
  }
};
