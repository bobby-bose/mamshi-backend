const mongoose = require('mongoose');

const pendingOrderSchema = new mongoose.Schema({
  merchantOrderId: {
    type: String,
    required: true,
    unique: true
  },
  useremail: {
    type: String,
    required: true
  },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      size: String,
      color: String,
      count: { type: Number, default: 1 }
    }
  ],
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // single product case
  size: String,
  color: String,
  count: { type: Number, default: 1 },
  deliveryDetails: {
    mainMobile: { type: String, required: true },
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // optional: auto-delete after 1 hour if payment not completed
  }
});

module.exports = mongoose.model('PendingOrder', pendingOrderSchema);
