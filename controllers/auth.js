const User = require("../models/User");

//@desc Register User
//@route POST /api/v1/auth/register
//@access Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, telephone } = req.body;
    //Create User
    const user = await User.create({
      name,
      email,
      password,
      telephone,
    });
    //Create token
    //const token = user.getSignedJwtToken();
    //res.status(200).json({ success: true, token });
    sendTokenResponse(user, 200, res);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      res.status(400).json({
        success: false,
        message: messages[0],
      });
    } else res.status(400).json({ success: false, message: "Error" });
    console.log(err.stack);
  }
};

//@desc Login User
//@route POST /api/v1/auth/login
//@access Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    //Validate email & password
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Please provide an email and password" });
    }

    //check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid credentials" });
    }

    //check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid credentials" });
    }

    //create token
    //const token = user.getSignedJwtToken();

    //res.status(200).json({ success: true, token });
    sendTokenResponse(user, 200, res);
  } catch (err) {
    return res.status(401).json({
      success: false,
      msg: "Cannot convert email or password to string",
    });
  }
};

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  //Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({ success: true, token });
};

//@desc Get Current Login User
//@route GET /api/v1/auth/me
//@access Private

exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
};

//@desc Log user out / clear cookie
//@route GET /api/auth/logout
//@access Private
exports.logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};
