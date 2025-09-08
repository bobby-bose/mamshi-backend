const express = require("express");
const multer = require("multer");
const Product = require("../models/productModel"); // adjust path if needed
const asyncErrorHandler = require("../middlewares/asyncErrorHandler"); // optional
const ErrorHandler = require("../utils/errorHandler"); // optional

const router = express.Router();
console.log("Router initialized");

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Setting destination for file:", file.originalname);
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    console.log("Setting filename for file:", file.originalname);
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
console.log("Multer initialized");

// =================== CONTROLLER ===================
const createProduct = async (req, res) => {
  console.log("createProduct called");
  try {
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    const { Name, Description, Price, S, M, L, XL, stock, colors } = req.body;
    console.log("Destructured body:", { Name, Description, Price, S, M, L, XL, stock, colors });

    // Uploaded images
    const main = req.files?.main ? req.files.main[0].path : null;
    const sub = req.files?.sub ? req.files.sub[0].path : null;
    console.log("Uploaded images paths:", { main, sub });

    // Parse colors if sent as JSON string
    const colorsArray = colors ? JSON.parse(colors) : [];
    console.log("Parsed colors array:", colorsArray);

const newProduct = await Product.create({
  Name,
  Description,
  Price,
  main,
  sub,
  S: S === "true",
  M: M === "true",
  L: L === "true",
  XL: XL === "true",
  stock: Number(stock),
  colors: colorsArray,
});

    console.log("New product created:", newProduct);

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================== ROUTES ===================
console.log("Setting up routes");

// Create new product with image upload
router.post(
  "/products/new",
  upload.fields([
    { name: "main", maxCount: 1 },
    { name: "sub", maxCount: 1 },
  ]),
  (req, res, next) => {
    console.log("POST /products/new called");
    next();
  },
  createProduct
);

console.log("Router export ready");
module.exports = router;
