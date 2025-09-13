const express = require('express');
const {
  createPendingOrder,
  completeOrderAfterPayment,
  getSingleOrderDetails,
  myOrders,
  getAllOrders
} = require('../controllers/orderController');

const router = express.Router();

// Create pending order (before payment)
router.post('/orders/pending', createPendingOrder);

// Complete order after successful payment
router.post('/orders/complete', completeOrderAfterPayment);

// Get single order details
router.get('/orders/:id', getSingleOrderDetails);

// Get logged-in user's orders
router.get('/orders/my', myOrders);

// Admin: get all orders
router.get('/orders', getAllOrders);

module.exports = router;
