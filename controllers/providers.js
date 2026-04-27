const Provider = require("../models/Provider");
const Rental = require("../models/Rental");
const Review = require("../models/Review");
const Car = require("../models/Car");
//@desc Get all Providers
//@route GET /api/v1/providers
//@access Public
exports.getProviders = async (req, res, next) => {
  let query;

  //Copy req.query
  const reqQuery = { ...req.query };

  //Fields to exclude
  const removeFields = ["select", "sort", "page", "limit"];

  //Loop over removeFields and delete them from reqQuery
  removeFields.forEach((param) => delete reqQuery[param]);

  //Create query String
  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`,
  );
  query = Provider.find(JSON.parse(queryStr)).populate("cars");

  //Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
  }

  //Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  //Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 0;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  try {
    const total = await Provider.countDocuments();
    query = query.skip(startIndex).limit(limit).lean();
    //Execute Query
    const providers = await query;

    //Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }
    res
      .status(200)
      .json({ success: true, count: providers.length, data: providers });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc Get single Providers
//@route GET /api/v1/providers/:id
//@access Public
exports.getProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id).lean();

    if (!provider) {
      return res.status(400).json({ success: false });
    }

    res.status(200).json({ success: true, data: provider });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc  Get provider with cars and bookings in one request
//@route GET /api/providers/:id/detail
//@access Public
exports.getProviderDetail = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [provider, cars, bookings, reviews] = await Promise.all([
      Provider.findById(req.params.id).lean(),
      Car.find({ provider: req.params.id }).lean(),
      Rental.find({
        provider: req.params.id,
        paymentStatus: { $in: ["pending", "paid"] },
        returnDate: { $gte: startOfToday },
      })
        .select("car rentalDate returnDate")
        .lean(),
      Review.find({ provider: req.params.id })
        .populate({ path: "user", select: "name" })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    if (!provider) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }

    res.status(200).json({
      success: true,
      data: { provider, cars, bookings, reviews },
    });
  } catch (err) {
    console.error(err.stack);
    res
      .status(500)
      .json({ success: false, message: "Cannot fetch provider detail" });
  }
};

//@desc Create all Providers
//@route POST /api/v1/providers
//@access Private
exports.createProvider = async (req, res, next) => {
  try {
    const provider = await Provider.create(req.body);
    res.status(201).json({ success: true, data: provider });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc Update single Providers
//@route PUT /api/v1/providers/:id
//@access Private
exports.updateProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!provider) {
      return res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true, data: provider });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc Delete single Providers
//@route DELETE /api/v1/providers/:id
//@access Private
exports.deleteProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: `Provider not found with id of ${req.params.id}`,
      });
    }
    await Rental.deleteMany({ provider: req.params.id });
    await Car.deleteMany({ provider: req.params.id });
    await Provider.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};
