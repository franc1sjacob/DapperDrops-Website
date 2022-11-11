const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Types.ObjectId,
        ref: "Order",
        required: true
    },
    dateSold: {
        type: Date,
        required: true
    },
    earnings: {
        type: Number,
        required: true
    },
    items: [{
        itemBrand: String,
        itemName: String,
        itemPrice: Number,
        itemVariation: String,
        itemQuantity: Number,
        itemTotal: Number
    }]
});

module.exports = mongoose.model("Sale", saleSchema);