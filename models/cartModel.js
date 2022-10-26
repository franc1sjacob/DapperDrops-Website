const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    products: [{
        productId:{
            type: mongoose.Types.ObjectId, 
            ref: 'products'
        },
        name: String,
        brand: String,
        category: String,
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }
    }],
    total: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Cart", cartSchema);