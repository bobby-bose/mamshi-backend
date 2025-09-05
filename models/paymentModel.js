const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  merchantOrderId: String,
  phonePeTxnId: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Payment", paymentSchema);
