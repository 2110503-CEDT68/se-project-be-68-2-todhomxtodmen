const mongoose = require("mongoose");

// Cache connection across serverless invocations to avoid reconnecting on every cold start
let cached = global.__mongoose;
if (!cached) cached = global.__mongoose = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
  }

  cached.conn = await cached.promise;
  console.log(`MongoDB Connected: ${cached.conn.connection.host}`);
  return cached.conn;
};

module.exports = connectDB;
