const express = require('express');
const { getAllProducts, getProductDetails, updateProduct, deleteProduct, getProductReviews, deleteReview, createProductReview,updateStock, createProduct, getAdminProducts, getProducts,createQuestion,getQuestions,getReviews, createReview } = require('../controllers/productController');
const Cart = require('../models/cart');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const productModel = require('../models/productModel');
const multer = require("multer");

const router = express.Router();

router.route('/products').get(getAllProducts);
router.route('/wishlist').get(async (req, res, next) => {
    try {
        const wishlistItems = await Cart.find();
        res.status(200).json({
            success: true,
            wishlistItems
        });
    } catch (error) {
        console.error("Error fetching wishlist items:", error);
        return next(new ErrorHandler("Failed to fetch wishlist items", 500));
    }
});
router.route('/product/:productId').get(async (req, res, next) => {
    try {
        console.log("Fetching product from backedn details for ID:", req.params.productId);
        const productDetails= await productModel.findById(req.params.productId);
        res.status(200).json({
            success: true,
            productDetails
        });
    } catch (error) {
        console.error("Error fetching productDetails items:", error);
        return next(new ErrorHandler("Failed to fetch productDetails items", 500));
    }
});
router.route('/wishlist/:productId/:mobileNumber').post(async (req, res, next) => {
  try {
    const { productId, mobileNumber } = req.params;
    const { size, color, count } = req.body; // now also get count

    // Basic validations
    if (!productId || !mobileNumber) {
      console.error("Product ID or Mobile Number missing");
      return next(new ErrorHandler("Product ID and Mobile Number are required", 400));
    }

    if (!size) {
      console.error("Size is missing");
      return next(new ErrorHandler("Size is required", 400));
    }

    // Ensure Cart model is loaded
    if (!Cart || typeof Cart.create !== "function") {
      console.error("MongoDB Model 'Cart' is not loaded correctly.");
      return next(new ErrorHandler("Database model not found", 500));
    }

    // Create the wishlist/cart item
    const newWishlistItem = await Cart.create({
      productId,
      mobileNumber,
      size,
      ...(color ? { color } : {}), // store color only if it exists
      count: count || 1,            // store count, default to 1
    });
console.log("New wishlist item created:", newWishlistItem);
    res.status(201).json({
      success: true,
      message: "Product added to wishlist successfully",
      data: newWishlistItem,
    });
  } catch (err) {
    console.error("Exception while adding product to wishlist:", err);
    return next(new ErrorHandler("Failed to add product to wishlist", 500));
  }
});



router.route('/wishlist/:wishlistId').delete(async (req, res, next) => {
    try {
        const { wishlistId } = req.params;

        if (!wishlistId) {
            return next(new ErrorHandler("Wishlist ID is required", 400));
        }

        const deletedItem = await Cart.findByIdAndDelete(wishlistId);

        if (!deletedItem) {
            return next(new ErrorHandler("Wishlist item not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "Wishlist item deleted successfully"
        });

    } catch (err) {
        console.error("Exception while deleting wishlist item:", err.message);
        return next(new ErrorHandler("Failed to delete wishlist item", 500));
    }
});
router.route('/products/questions/:productId/:mobileNumber').post(createQuestion);

router.route('/products/reviews/:productId/:mobileNumber').post(createReview);
router.route('/reviews/:productId').get(getReviews);
router.route('/questions/:productId').get(getQuestions);
router.route("/products/:productId/stock").put(updateStock);
router.route('/products/').get(getProducts);

router.route('/admin/products').get( getAdminProducts);
router.route('/admin/product/new').post( createProduct);

router.route('/admin/product/:id')
    .put( updateProduct)
    .delete( deleteProduct);

router.route('/product/:id').get(getProductDetails);

router.route('/review').put(createProductReview);

router.route('/admin/reviews')
    .get(getProductReviews)
    .delete(deleteReview);


const Product = require('../models/productModel'); // adjust path



// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // folder must exist
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// =================== CREATE PRODUCT ===================
router.post(
  '/products/new',
  upload.fields([
    { name: 'main', maxCount: 1 },
    { name: 'sub', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { Name, Description, Price, S, M, L, XL, stock, colors } = req.body;

      // Get uploaded images paths
      const main = req.files?.main ? `/uploads/${req.files.main[0].filename}` : null;
      const sub = req.files?.sub ? `/uploads/${req.files.sub[0].filename}` : null;

      // Parse colors
      const colorsArray = colors ? JSON.parse(colors) : [];

      // Save to DB
      const newProduct = await Product.create({
        Name,
        Description,
        Price: Number(Price),
        S: S === 'true' || S === true,
        M: M === 'true' || M === true,
        L: L === 'true' || L === true,
        XL: XL === 'true' || XL === true,
        stock: Number(stock),
        colors: colorsArray,
        main,
        sub
      });

      res.status(201).json({ success: true, product: newProduct });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =================== GET ALL PRODUCTS ===================
router.get('/products/all', async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =================== UPDATE STOCK ===================
router.put('/products/:id/stock', async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.stock = Number(stock);
    await product.save();

    res.json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;

