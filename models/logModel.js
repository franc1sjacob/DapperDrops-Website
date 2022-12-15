const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },

    user: {
        type: String,
        required: true
    },

    action: {
        type: String,
        required: true
    },

    reason: {
        type: String
    },

    category: {
        type: String,
        required: true
    },

    dateLog: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Log", logSchema);