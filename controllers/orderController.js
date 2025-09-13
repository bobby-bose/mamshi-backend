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

// Create Order (single or multiple products)
exports.createOrder = asyncErrorHandler(async (req, res, next) => {
  const { deliveryDetails, products, productId, size, color, count } = req.body;

  if (!deliveryDetails || !deliveryDetails.mainMobile) {
    return next(new ErrorHandler("Delivery mainMobile is required", 400));
  }

  let orderProducts = [];
  let totalAmount = 0;

  // If multiple products passed in "products" array
  if (products && products.length > 0) {
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) return next(new ErrorHandler(`Product ${item.productId} not found`, 404));

      const orderItem = {
        product: product._id,
        productName: product.Name,
        size: item.size,
        color: item.color,
        count: item.count || 1,
        price: product.Price
      };
      orderProducts.push(orderItem);
      totalAmount += product.Price * (item.count || 1);
    }
  } 
  // If single product passed via productId
  else if (productId) {
    const product = await Product.findById(productId);
    if (!product) return next(new ErrorHandler("Product Not Found", 404));

    const orderItem = {
      product: product._id,
      productName: product.Name,
      size: size,
      color: color,
      count: count || 1,
      price: product.Price
    };
    orderProducts.push(orderItem);
    totalAmount += product.Price * (count || 1);
  } else {
    return next(new ErrorHandler("No products provided", 400));
  }
const user = await User.findOne({ email: req.body.email });
if (!user) return next(new ErrorHandler("User not found", 404));

const order = await Order.create({
  user: user._id,   // <-- ObjectId
  products: orderProducts,
  totalAmount,
  payment: { status: "PENDING" },
  deliveryDetails,
  luckyDrawCode: null,
  purchaseNumber: null
});


  res.status(201).json({
    success: true,
    message: "Order added successfully",
    order
  });
});


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

// Update Order (Payment completion or shipping status)
exports.updateOrder = asyncErrorHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  // If updating payment to COMPLETED
  if (req.body.paymentStatus && req.body.paymentStatus === "COMPLETED" && order.payment.status !== "COMPLETED") {
    order.payment.status = "COMPLETED";
    order.payment.paidAt = Date.now();

    // Assign purchaseNumber
    const completedCount = await Order.countDocuments({ "payment.status": "COMPLETED" });
    order.purchaseNumber = completedCount + 1;

    // Generate sequential luckyDrawCode
    const couponNumber = order.purchaseNumber.toString().padStart(5, '0'); // 00001 → 50000
    order.luckyDrawCode = `SLOUCH-COUPON-${couponNumber}`;
  }

  // Update shipping / delivery status
  if (req.body.status) {
    if (order.orderStatus === "Delivered") {
      return next(new ErrorHandler("Already Delivered", 400));
    }

    if (req.body.status === "Shipped") {
      order.shippedAt = Date.now();
      for (const i of order.products) {
        await updateStock(i.product, i.count);
      }
    }

    order.orderStatus = req.body.status;
    if (req.body.status === "Delivered") order.deliveredAt = Date.now();
  }

  await order.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    order
  });
});

// Delete Order --- ADMIN
exports.deleteOrder = asyncErrorHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  await order.remove();

  res.status(200).json({
    success: true
  });
});
