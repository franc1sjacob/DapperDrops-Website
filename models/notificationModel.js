const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },

    productVariation: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    reason: {
        type: String
    },

  

    dateLog: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Notification", logSchema);