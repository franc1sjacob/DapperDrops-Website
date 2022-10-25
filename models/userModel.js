const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    password: {
        type: String,
        required: true
    },
    accountType: {
        type: String,
        required: true
    },
    isVerified: {
        type: String,
        default: false
    },
    token: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model("User", userSchema);