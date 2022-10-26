const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    brand: String,
    name: String,
    price: Number,
    description: String,
    quantity: Number,
    image: String,
    category: String
});

module.exports = mongoose.model("Product", productSchema);