const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    products: [
        {
            productId: {
                type: mongoose.Types.ObjectId,
            },
            image: {
                type: String,
                required: true
            },
            name: {
                type: String,
                required: true
            },
            brand: {
                type: String,
                required: true
            },
            category: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        }
    ]
});

module.exports = mongoose.model("Wishlist", wishlistSchema);