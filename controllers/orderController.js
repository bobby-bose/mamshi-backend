const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');

// Helper: update stock after shipment
async function updateStock(id, quantity) {
  const product = await Product.findById(id);
  product.stock -= quantity;
  await product.save({ validateBeforeSave: false });
}


// Create Order AFTER payment is COMPLETED
exports.createOrderAfterPayment = async ({ deliveryDetails, products, productId, size, color, count, email }) => {
  if (!deliveryDetails || !deliveryDetails.mainMobile) {
    throw new ErrorHandler("Delivery mainMobile is required", 400);
  }

  let orderProducts = [];
  let totalAmount = 0;

  if (products && products.length > 0) {
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) throw new ErrorHandler(`Product ${item.productId} not found`, 404);
      orderProducts.push({
        product: product._id,
        productName: product.Name,
        size: item.size,
        color: item.color,
        count: item.count || 1,
        price: product.Price
      });
      totalAmount += product.Price * (item.count || 1);
    }
  } else if (productId) {
    const product = await Product.findById(productId);
    if (!product) throw new ErrorHandler("Product Not Found", 404);
    orderProducts.push({
      product: product._id,
      productName: product.Name,
      size,
      color,
      count: count || 1,
      price: product.Price
    });
    totalAmount += product.Price * (count || 1);
  } else {
    throw new ErrorHandler("No products provided", 400);
  }

  const user = await User.findOne({ email });
  if (!user) throw new ErrorHandler("User not found", 404);

  const purchaseNumber = (await Order.countDocuments({ "payment.status": "COMPLETED" })) + 1;

  const order = await Order.create({
    user: user._id,
    products: orderProducts,
    totalAmount,
    payment: { status: "COMPLETED", paidAt: Date.now() },
    deliveryDetails,
    purchaseNumber,
    luckyDrawCode: `SLOUCH-COUPON-${purchaseNumber.toString().padStart(5, '0')}`
  });

  for (const item of order.products) {
    await updateStock(item.product, item.count);
  }

  return order;
};


// Get Single Order Details
exports.getSingleOrderDetails = asyncErrorHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  res.status(200).json({
    success: true,
    order
  });
});

// Get Logged In User Orders
exports.myOrders = asyncErrorHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });

  if (!orders || orders.length === 0) return next(new ErrorHandler("Orders Not Found", 404));

  res.status(200).json({
    success: true,
    orders
  });
});

// Get All Orders (Admin)
exports.getAllOrders = asyncErrorHandler(async (req, res, next) => {
  // Fetch all orders with completed payment
  const orders = await Order.find({ "payment.status": "COMPLETED" });

  // Count unique users (by mainMobile in deliveryDetails)
  const uniqueUsers = await Order.distinct("deliveryDetails.mainMobile", { "payment.status": "COMPLETED" });

  res.status(200).json({
    success: true,
    totalOrders: orders.length,
    uniqueUsersCount: uniqueUsers.length,
    orders
  });
});



