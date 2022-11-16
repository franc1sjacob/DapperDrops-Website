const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    status: {
        type: String,
        default: 'inactive'
    },
    homeImage : [{
        image: {
            type: String
        }
    }],
    homeText: {
        type: String,
        required: true
    },
    aboutUsText: {
        type: String,
        required: true
    },
    aboutUsImage: [{
        image: {
            type: String
        }
    }],
    footerText: {
        type: String
    },
    footerContactEmail: {
        type: String
    },
    footerContactNumber: {
        type: String
    },
    payment: [{
        paymentName: String,
        userName: String,
        bankNumber: String,
        qrCodeImage: String
    }]
});

module.exports = mongoose.model("Content", contentSchema);