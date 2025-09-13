const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      productName: { type: String, required: true },
      color: String,
      size: String,
      count: { type: Number, required: true, default: 1 },
      price: { type: Number, required: true }
    }
  ],

  totalAmount: { type: Number, required: true },

  payment: {
    merchantOrderId: String,
    phonePeTxnId: String,
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED"], default: "PENDING" },
    paidAt: { type: Date }
  },

  deliveryDetails: {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    pincode: { type: String, required: true },
    mainMobile: { type: String, required: true },
    altMobile: { type: String }
  },

  luckyDrawCode: { type: String, unique: true, sparse: true },  // raffle coupon code

  purchaseNumber: { type: Number, unique: true, sparse: true },  // Nth completed purchase

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);
