const express = require("express");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const mongoSanitize = require("@exortek/express-mongo-sanitize");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const hpp = require("hpp");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Eagerly start DB connection (non-blocking — middleware below ensures it's ready per request)
connectDB().catch((err) => console.error("Initial DB connection error:", err));

const app = express();

//Query parser
app.set("query parser", "extended");

//Body parser
app.use(express.json());

//CORS
const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // allow any .vercel.app domain
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

//Prevent http param pollutions
app.use(hpp());

//Prevent XSS attacks
app.use(xss());

//Set security headers
app.use(helmet());

//Sanitize data
app.use(mongoSanitize());

//Cookie parser
app.use(cookieParser());

// Ensure DB is connected before each request (handles concurrent cold-start races)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection failed:", err.message);
    res.status(503).json({ success: false, message: "Database unavailable" });
  }
});

// ---------- Swagger ----------
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "GoGo Rental API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: require("./swagger.schemas"),
    },
  },
  apis: ["./routes/*.js"],
});

app.get("/swagger.json", (req, res) => res.json(swaggerSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// ---------- End Swagger ----------

//Route files
const providers = require("./routes/providers");
const auth = require("./routes/auth");
const rentals = require("./routes/rentals");
const cars = require("./routes/cars");
const notifications = require("./routes/notifications");
const reviews = require("./routes/reviews");
const reviewsAdmin = require("./routes/reviews-admin");

//Mount routers
app.use("/api/providers", providers);
app.use("/api/auth", auth);
app.use("/api/rentals", rentals);
app.use("/api/cars", cars);
app.use("/api/notifications", notifications);
app.use("/api/providers/:providerId/reviews", reviews);
app.use("/api/reviews", reviewsAdmin);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(
    "Server running in ",
    process.env.NODE_ENV,
    " mode on port ",
    PORT,
  ),
);

//Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  //Close server & exit
  server.close(() => process.exit(1));
});
