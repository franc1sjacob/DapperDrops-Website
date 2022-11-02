const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId, 
        ref: 'users'
    },
    products: [{
        productId:{
            type: mongoose.Types.ObjectId, 
            ref: 'products'
        },
        name: String,
        brand: String,
        category: String,
        variation: String,
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }, 
        price: Number,
        totalPrice: Number
    }],
    total: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Cart", cartSchema);