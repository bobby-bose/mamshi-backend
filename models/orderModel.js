const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    productName: {
        type: String,
        required: true,  // store product name directly for convenience
        trim: true
    },
    email: {
        type: String,   // kept as string to handle leading zeros or country codes
        required: true
    },
    color: {
        type: String,
       
        trim: true
    },
    size: {
        type: String,
        required: true,
        trim: true
    },
    count: {
        type: Number,
        required: true,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Order", orderSchema);
