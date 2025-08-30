const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,   // handle leading zeros or country codes
        required: true
    },
    size: {
        type: String,   // e.g. "S", "M", "L", "XL"
        required: true
    },
    color: {
        type: String,   // optional
    },
    count: {
        type: Number,   // quantity of this item
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Cart", cartSchema);
