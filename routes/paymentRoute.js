const express = require('express');
const { startPayment, completePayment } = require('../controllers/paymentController');

const router = express.Router();

// Start a new payment
router.route('/payments/start').post(startPayment);

// Complete payment after user makes payment
router.route('/payments/complete').post(completePayment);

module.exports = router;
