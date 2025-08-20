const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    productId: {
        type:String,
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

module.exports = mongoose.model("Cart", cartSchema);
