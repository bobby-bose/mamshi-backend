const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const PendingOrder = require('../models/pendingOrderModel');

// Helper: update stock after shipment
async function updateStock(id, quantity) {
  const product = await Product.findById(id);
  if (!product) throw new Error(`Product ${id} not found`);
  product.stock -= quantity;
  await product.save({ validateBeforeSave: false });
}

// -------------------------
// Create Pending Order (before payment)
// -------------------------
// POST /orders/pending
exports.createPendingOrder = asyncErrorHandler(async (req, res, next) => {
  const { deliveryDetails, products, email } = req.body;
  
  if (!deliveryDetails?.mainMobile) 
    return next(new ErrorHandler("Delivery mainMobile is required", 400));

  // Generate merchantOrderId now, so frontend knows it for payment
  const merchantOrderId = "order_" + Date.now();

  const pending = await PendingOrder.create({
    deliveryDetails,
    products,
    useremail: email,
    merchantOrderId
  });

  res.status(200).json({ success: true, pendingOrder: pending });
});


// -------------------------
// Create Order AFTER payment is COMPLETED
// -------------------------
async function createOrderAfterPayment({ deliveryDetails, products, productId, size, color, count, email }) {
  if (!deliveryDetails || !deliveryDetails.mainMobile) {
    throw new ErrorHandler("Delivery mainMobile is required", 400);
  }

  // Prepare order products
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

  // Find user
  const user = await User.findOne({ email });
  if (!user) throw new ErrorHandler("User not found", 404);

  // Assign purchaseNumber
  const purchaseNumber = (await Order.countDocuments({ "payment.status": "COMPLETED" })) + 1;

  // Create order
  const order = await Order.create({
    user: user._id,
    products: orderProducts,
    totalAmount,
    payment: { status: "COMPLETED", paidAt: Date.now() },
    deliveryDetails,
    purchaseNumber,
    luckyDrawCode: `SLOUCH-COUPON-${purchaseNumber.toString().padStart(5, '0')}`
  });

  // Reduce stock immediately after order
  for (const item of order.products) {
    await updateStock(item.product, item.count);
  }

  return order;
}
exports.createOrderAfterPayment = createOrderAfterPayment;

// -------------------------
// Complete Order after payment
// -------------------------
exports.completeOrderAfterPayment = asyncErrorHandler(async (req, res, next) => {
  const { merchantOrderId } = req.body;

  if (!merchantOrderId) {
    return next(new ErrorHandler("merchantOrderId is required", 400));
  }

  // Find the pending order saved before payment
  const pendingOrder = await PendingOrder.findOne({ merchantOrderId });
  if (!pendingOrder) {
    return next(new ErrorHandler("Pending order not found", 404));
  }

  // Create actual order
  const order = await createOrderAfterPayment({
    deliveryDetails: pendingOrder.deliveryDetails,
    products: pendingOrder.products,
    productId: pendingOrder.productId,
    size: pendingOrder.size,
    color: pendingOrder.color,
    count: pendingOrder.count,
    email: pendingOrder.useremail
  });

  // Delete pending order
  await pendingOrder.deleteOne();

  res.status(200).json({
    success: true,
    message: "Payment verified and order created successfully",
    order
  });
});

// -------------------------
// Admin / User Routes
// -------------------------
exports.getSingleOrderDetails = asyncErrorHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return next(new ErrorHandler("Order Not Found", 404));
  res.status(200).json({ success: true, order });
});

exports.myOrders = asyncErrorHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });
  if (!orders || orders.length === 0) return next(new ErrorHandler("Orders Not Found", 404));
  res.status(200).json({ success: true, orders });
});

exports.getAllOrders = asyncErrorHandler(async (req, res, next) => {
  const orders = await Order.find({ "payment.status": "COMPLETED" });
  const uniqueUsers = await Order.distinct("deliveryDetails.mainMobile", { "payment.status": "COMPLETED" });
  res.status(200).json({
    success: true,
    totalOrders: orders.length,
    uniqueUsersCount: uniqueUsers.length,
    orders
  });
});
