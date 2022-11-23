const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    products: [
        {
            productId: {
                type: mongoose.Types.ObjectId
            }
        }
    ]
});

module.exports = mongoose.model("Wishlist", wishlistSchema);