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
    aboutUsParagraph1: {
        type: String,
        required: true
    },
    aboutUsParagraph2: {
        type: String,
        required: true
    },
    aboutUsParagraph3: {
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
    }],
    faqs: [{
        question: String,
        answer: String
    }]
});

module.exports = mongoose.model("Content", contentSchema);