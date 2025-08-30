const express = require('express');
const { getAllProducts, getProductDetails, updateProduct, deleteProduct, getProductReviews, deleteReview, createProductReview,updateStock, createProduct, getAdminProducts, getProducts,createQuestion,getQuestions,getReviews, createReview } = require('../controllers/productController');
const Cart = require('../models/cart');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const productModel = require('../models/productModel');


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
router.route('/products/all').get(getProducts);
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

module.exports = router;