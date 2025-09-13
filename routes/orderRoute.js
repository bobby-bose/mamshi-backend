const express = require('express');
const { createOrder, getAllOrders } = require('../controllers/orderController');


const router = express.Router();


router.route('/orders/productId/mobilenumber').post( createOrder);

router.route('/orders').get( getAllOrders);



module.exports = router;