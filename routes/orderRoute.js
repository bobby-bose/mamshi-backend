const express = require('express');
const { createOrderAfterPayment } = require('../controllers/orderController');
const { getAllOrders } = require('../controllers/orderController');


const router = express.Router();




router.route('/orders/productId/mobilenumber').post(createOrderAfterPayment);
router.route('/orders').get(getAllOrders);




module.exports = router;