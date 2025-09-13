const express = require('express');
const { startPayment, completePayment } = require('../controllers/paymentController');

const router = express.Router();

// Start a new payment
router.post('/payments/start', startPayment);

// Complete payment after user makes payment
router.post('/payments/complete', completePayment);

module.exports = router;
