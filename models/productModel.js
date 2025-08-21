const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    Description: { type: String, required: true },
    Price: { type: Number, required: true },
    main: { type: String, required: true },
    sub: { type: String },
    S: { type: Boolean, default: false },
    M: { type: Boolean, default: false },
    L: { type: Boolean, default: false },
    XL: { type: Boolean, default: false },
});

module.exports = mongoose.model('Product', productSchema);
