const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  Name: String,
  Description: String,
  Price: Number,
  colors: [String],
  stock: Number,
  S: Boolean,
  M: Boolean,
  L: Boolean,
  XL: Boolean,
  main: String,  // main image filename
  sub: String    // sub image filename
});


module.exports = mongoose.model('Product', productSchema);




