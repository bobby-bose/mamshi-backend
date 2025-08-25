const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    product: {
         type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    mobileNumber: {
        type: String,   // kept as string to handle leading zeros or country codes
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Order", orderSchema);
