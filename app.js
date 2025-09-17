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
  "https://143.110.179.42",
];


app.use(
  cors({
    origin: (origin, callback) => {
      // If request has no origin (Postman, curl), allow it
      if (!origin) return callback(null, true);

      // Allow requests from allowed frontend domains
      if (allowedFrontendOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Optional: allow mobile devices accessing backend via raw IP (for testing)
      // Comment out in production for security
      const allowedBackendIPs = ["https://143.110.179.42"];
      if (allowedBackendIPs.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
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
