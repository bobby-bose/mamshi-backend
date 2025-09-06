const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const ErrorHandler = require('../utils/errorHandler');


// Create New Order
exports.newOrder = asyncErrorHandler(async (req, res, next) => {

    const {
        shippingInfo,
        orderItems,
        paymentInfo,
        totalPrice,
    } = req.body;

    const orderExist = await Order.findOne({ paymentInfo });

    if (orderExist) {
        return next(new ErrorHandler("Order Already Placed", 400));
    }

    const order = await Order.create({
        shippingInfo,
        orderItems,
        paymentInfo,
        totalPrice,
        paidAt: Date.now(),
        user: req.user._id,
    });



    res.status(201).json({
        success: true,
        order,
    });
});

// Get Single Order Details
exports.getSingleOrderDetails = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    res.status(200).json({
        success: true,
        order,
    });
});

// i need a addOrders function to add orders to the cart accepting productId and the mobileNumber

exports.addOrders = asyncErrorHandler(async (req, res, next) => {
    const { productId, mobileNumber, size, color, count } = req.body;

    if (!productId || !mobileNumber) {
        return next(new ErrorHandler("Product ID and Mobile Number are required", 400));
    }

    if (!size) {
        return next(new ErrorHandler("Size is required", 400));
    }

    

    const product = await Product.findById(productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    // Create the order
    const order = await Order.create({
        product: product._id,          // store product ObjectId
        productName: product.Name,     // store product name directly
        email:mobileNumber,
        size,
        color,
        count: count || 1              // use passed count or default to 1
    });

    res.status(201).json({
        success: true,
        message: "Order added successfully",
        order
    });
});


// Get Logged In User Orders
exports.myOrders = asyncErrorHandler(async (req, res, next) => {

    const orders = await Order.find({ user: req.user._id });

    if (!orders) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    res.status(200).json({
        success: true,
        orders,
    });
});


exports.getAllOrders = asyncErrorHandler(async (req, res, next) => {
    const initialVouchers = 50000;

    // Find all unique email users with COMPLETED payments
    const uniqueEmailUsers = await Payment.aggregate([
       
        { $group: { _id: "$useremail" } } // group by email
    ]);

    const numberOfUniqueEmails = uniqueEmailUsers.length;
    const vouchersLeft = Math.max(0, initialVouchers - numberOfUniqueEmails);

    res.status(200).json({
        success: true,
        vouchersLeft,
        numberOfUniqueEmails,
    });
});

// exports.getAllOrders = asyncErrorHandler(async (req, res, next) => {
//     // Find all orders and group them by mobileNumber to get unique customers
//     const uniqueCustomers = await Order.aggregate([
//         {
//             $group: {
//                 _id: "$mobileNumber"
//             }
//         }
//     ]);

//     // The count of unique customers is the length of the resulting array
//     const numberOfCustomers = uniqueCustomers.length;

//     // To get the total order count and amount for all customers (optional, but good practice)
//     const orders = await Order.find();
//     let totalAmount = 0;
//     orders.forEach((order) => {
//         totalAmount += order.totalPrice; // Assuming totalPrice exists in your Order model
//     });

//     res.status(200).json({
//         success: true,
//         orders, // All orders are still returned for the admin dashboard
//         totalAmount,
//         numberOfCustomers, // This is the new, requested field
//     });
// });

// Update Order Status ---ADMIN
exports.updateOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    if (order.orderStatus === "Delivered") {
        return next(new ErrorHandler("Already Delivered", 400));
    }

    if (req.body.status === "Shipped") {
        order.shippedAt = Date.now();
        order.orderItems.forEach(async (i) => {
            await updateStock(i.product, i.quantity)
        });
    }

    order.orderStatus = req.body.status;
    if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
    }

    await order.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true
    });
});

async function updateStock(id, quantity) {
    const product = await Product.findById(id);
    product.stock -= quantity;
    await product.save({ validateBeforeSave: false });
}

// Delete Order ---ADMIN
exports.deleteOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    await order.remove();

    res.status(200).json({
        success: true,
    });
});