const express = require('express');
const cors = require('cors');
const Product = require('../models/productModel'); 
const router = express.Router(); 

router.get('/product-count', cors(), async (req, res, next) => { 
    try {
        const productsCount = await Product.countDocuments(); 
        console.log(`Sending product count: ${productsCount}`);

        res.status(200).json({
            success: true,
            productCount: productsCount
        });
    } catch (error) {

        console.error('Error fetching product count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve product count.'
        });
    }
});

module.exports = router;