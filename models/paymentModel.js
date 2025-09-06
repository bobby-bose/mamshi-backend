const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  useremail: String,
  userId: String,
  amount: Number,
  merchantOrderId: String,
  phonePeTxnId: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Payment", paymentSchema);
