const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },

    cart: {
        type: Object,
        required: true
    },

    address: {
        type: Object
    },

    paymentStatus: {
        type: String,
        default: "Pending"
    },

    orderStatus: {
        type: String,
        default: "Pending"
    },

    shippingStatus: {
        type: String,
        default: "Pending"
    },

    paymentMethod: {
        type: String,
        required: true
    },

    paymentsInfo: [{
        paymentProof: {
            type: String,
        },
    
        paymentDescription: {
            type: String
        }
    }],

    dateCreated: {
        type: Date,
        required: true
    },

    amountPaid: {
        type: Number,
        default: 0
    },
    
    amountRemaining:{
        type: Number,
        required: true
    },

    feedbackMessage: {
        type: String
    },
    feedbackRate: {
        type: String
    }
});

module.exports = mongoose.model("Order", orderSchema);