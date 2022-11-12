const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
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
    },

    orderStatus: {
        type: String,
    },

    paymentMethod: {
        type: String
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
        type: Date
    },

    amountPaid: {
        type: Number,
    },
    
    amountRemaining:{
        type: Number
    }
});

module.exports = mongoose.model("Order", orderSchema);