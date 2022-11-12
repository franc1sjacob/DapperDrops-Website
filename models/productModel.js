const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    brand: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    variations: [{
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    totalQuantitySold: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Product", productSchema);