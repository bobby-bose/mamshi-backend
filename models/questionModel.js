const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: String, // You can use String for mobileNumber or ObjectId for a User model
    
  },
  question: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

});

module.exports = mongoose.model('Question', questionSchema);