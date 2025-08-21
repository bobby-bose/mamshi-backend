const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,   // kept as string to handle leading zeros or country codes
        required: true
    },
    size: {
        type: String,   // e.g. "S", "M", "L", "XL" or "42", "8 UK" etc.
        required: true  // ✅ make required since user must pick a size
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Cart", cartSchema);
