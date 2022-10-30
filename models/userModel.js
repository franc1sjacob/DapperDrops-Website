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
    addresses: [{
        fullName: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        },
        region: {
            type: String,
            required: true
        },
        province: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        barangay: {
            type: String,
            required: true
        },
        postalCode: {
            type: String,
            required: true
        },
        streetName:{
            type: String,
            required: true
        }
    }],
    token: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model("User", userSchema);