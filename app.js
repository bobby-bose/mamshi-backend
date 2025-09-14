const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const errorMiddleware = require("./middlewares/error");

// Import routes
const userRoutes = require("./routes/userRoute");
const productRoutes = require("./routes/productRoute");
const paymentRoutes = require("./routes/paymentRoute");
const giveawayRoutes = require("./routes/giveaway");
const addProductRoutes = require("./routes/addProduct");

const app = express();

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:3000",      // React dev server
  "https://slouch.netlify.app", // Production frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use("/api/v1", userRoutes);
app.use("/api/v1", productRoutes);

app.use("/api/v1", paymentRoutes);
app.use("/api/v1", giveawayRoutes);
app.use("/api/v1", addProductRoutes);

// Error middleware
app.use(errorMiddleware);

module.exports = app;
