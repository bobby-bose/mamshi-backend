const express = require('express');
const { startPayment, completePayment } = require('../controllers/paymentController');
const { startBulkPayment, completeBulkPayment } = require('../controllers/paymentBulkController');

const router = express.Router();

// Start a new payment
router.post('/payments/start', startPayment);

// Complete payment after user makes payment
router.post('/payments/complete', completePayment);

router.post('/payments-bulk/start', startBulkPayment);

// Complete payment after user makes payment
router.post('/payments-bulk/complete', completeBulkPayment);

module.exports = router;
