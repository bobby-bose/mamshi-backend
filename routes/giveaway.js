const express = require('express');
const Counter = require('../models/counterModel.js');


const router = express.Router();

router.route('/giveaway').get(async (req, res) => {
  try {
    // Get the single counter document
    const counterDoc = await Counter.findOne({}); // no filter needed if only 1 document
    const seqValue = counterDoc ? counterDoc.seq : 0;

    res.status(200).json({
      success: true,
      seq: seqValue,  // sending the seq value
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});



module.exports = router;
