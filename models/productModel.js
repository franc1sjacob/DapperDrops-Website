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
        stockAcquired: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        status: {
            type: String
        }
    }],
    description: {
        type: String,
        required: true
    },
    image: {
        public_id:{
            type: String,
            required: true
        },
        url: {
                type: String,
                required: true
        }
        
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
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Product", productSchema);