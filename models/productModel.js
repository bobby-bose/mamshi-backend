// models/productModel.js
const mongoose = require('mongoose');

// Define a reusable schema for image objects to avoid repetition
const imageSchema = new mongoose.Schema({
    public_id: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
}, { _id: false }); // This prevents Mongoose from creating a default _id for each nested image object.

// Define the main product schema
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter the product name'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Please enter the product description'],
    },
    price: {
        type: Number,
        required: [true, 'Please enter the product price'],
    },
    // The main image is an object that is required for every product.
    mainImage: {
        type: imageSchema,
        required: [true, 'A product must have a main image.'],
    },
    // The sub-image is an object that is optional.
    subImage: {
        type: imageSchema,
        required: false,
    },
    sizes: {
        S: { type: Boolean, default: false },
        M: { type: Boolean, default: false },
        L: { type: Boolean, default: false },
        XL: { type: Boolean, default: false },
    },
});

module.exports = mongoose.model('Product', productSchema);