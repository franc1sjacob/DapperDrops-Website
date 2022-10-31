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
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        addressLine: {
            type: String,
            required: true
        },
        region: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        postalCode: {
            type: String,
            required: true
        },
        barangay: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        },
        email:{
            type: String,
            required: true
        }
    }],
    defaultAddress: {
        _id: {
            type: mongoose.Types.ObjectId
        },
        firstName: {
            type: String,
        },
        lastName: {
            type: String,
        },
        addressLine: {
            type: String,
        },
        region: {
            type: String,
        },
        city: {
            type: String,
        },
        postalCode: {
            type: String,
        },
        barangay: {
            type: String,
        },
        phoneNumber: {
            type: String,
        },
        email:{
            type: String
        }
    },
    token: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model("User", userSchema);