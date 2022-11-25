const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require("multer")

const mongoose = require('mongoose');

const Content = require("../../models/contentModel");

const isAuth = function(req, res, next){
    if(req.session.isAuth){
        next();
    } else {
        res.redirect('/account/login');
    }
}

const isAdmin = function(req, res, next){
    if(req.session.accountType === "admin"){
        req.session.isAdmin = true;
        next();
    } else {
        res.redirect('/');
    }
}

const homeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/content/home')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + path.extname(file.originalname))
    }
});

const aboutUsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/content/aboutus')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + path.extname(file.originalname))
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(file.fieldname == 'homeImage1' || file.fieldname == 'homeImage2' || file.fieldname == 'homeImage3'){
            cb(null, 'public/images/content/home');
        } else if (file.fieldname == 'aboutUsImage1' || file.fieldname == 'aboutUsImage2' || file.fieldname == 'aboutUsImage3') {
            cb(null, 'public/images/content/aboutus');
        } else {
            cb(null, 'public/images/content/home');
        }
    },
    filename: (req, file, cb) => {
        if(file.fieldname == 'qrCodeImage'){
            cb(null, file.fieldname + '_' + Date.now() + "_" + file.originalname)
        } else {
            cb(null, file.fieldname + path.extname(file.originalname))
        }

    }
});
const upload = multer({storage: storage,fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    if(ext !== '.png' && ext !== '.jpg'  && ext !== '.jpeg' && ext !== '.jfif') {
        return callback(new Error('Only images are allowed'))
    }
    callback(null, true)
},
limits:{
    fileSize: 1024 * 1024
}})

const uploadMultiple = multer({ storage: storage });
const multipleUploadHome = uploadMultiple.fields([{ name: 'homeImage1' }, { name: 'homeImage2' }, { name: 'homeImage3' }])
const multipleUploadAboutUs = uploadMultiple.fields([{ name: 'aboutUsImage1' }, { name: 'aboutUsImage2' }, { name: 'aboutUsImage3' }])
const multipleUploadHomeAboutUs = uploadMultiple.fields([{ name: 'homeImage1' }, { name: 'homeImage2' }, { name: 'homeImage3' }, { name: 'aboutUsImage1' }, { name: 'aboutUsImage2' }, { name: 'aboutUsImage3' } ]);

const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
    cloud_name: 'dupbncewr', 
    api_key: '269958243189147', 
    api_secret: 'C5UUJnq3B9G0Sfi8poTWl1AgKCY' 
  });

router.get('/', isAuth, isAdmin, async function(req, res){
    const content = await Content.findOne({ status: 'active' });
    res.render('admin/content/content', {fullName: req.session.firstName + " " + req.session.lastName, content: content});
});

router.get('/edit-text-:field', isAuth, isAdmin, function(req, res){
    const field = req.params.field;
    let title, check;

    if(field == 'homeText') {
        title = 'Home: Text';
        check = true;
    } else if (field == 'aboutUsParagraph1') {
        title = 'About Us: Paragraph 1';
        check = true;
    } else if (field == 'aboutUsParagraph2') {
        title = 'About Us: Paragraph 2';
        check = true;
    } else if (field == 'aboutUsParagraph3') {
        title = 'About Us: Paragraph 3';
        check = true;
    } else if (field == 'footerText') {
        title = 'Footer: Text';
        check = true;
    } else if (field == 'footerContactEmail') {
        title = 'Footer: Contact Email';
        check = true;
    } else if (field == 'footerContactNumber') {
        title = 'Footer: Contact Number';
        check = true;
    } else {
        check = false;
    }

    if(check) {
        res.render('admin/content/edit-text-content', { fullName: req.session.firstName + " " + req.session.lastName, field: field, title: title });
    } else {
        res.redirect('/admin/content')
    }

});
router.get('/view-homepageImage', isAuth, isAdmin, async (req, res) => {
    const content = await Content.findOne({ status: 'active' });
    res.render('admin/content/view-homepageImage', { content: content, fullName: req.session.firstName + " " + req.session.lastName });
});
router.get('/add-homepageImage', isAuth, isAdmin, function(req, res){
    res.render('admin/content/add-homepageImage', { fullName: req.session.firstName + " " + req.session.lastName });
});
router.post('/add-homepageImage', isAuth, isAdmin, upload.single('homeImage') ,async function(req, res){
    const result = await cloudinary.uploader.upload(req.file.path,{
        folder: "HomeImage",
    })
    const homeImage = {
        image: {
                public_id: result.public_id,
                url: result.secure_url
        },
    };

    Content.findOneAndUpdate({ status: 'active' }, { $push: { homeImage: [homeImage] } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content/view-homepageImage');
        }
    });
});
router.post('/delete-homeimageImage/:homeimageImageId', isAuth, isAdmin, function(req, res){
    const { homeimageImageId } = req.params;
    Content.findOneAndUpdate({ status: 'active' }, { $pull: { homeImage: { _id: homeimageImageId } } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content/view-homepageImage');
        }
    });
});
router.get('/view-aboutusImage', isAuth, isAdmin, async (req, res) => {
    const content = await Content.findOne({ status: 'active' });
    res.render('admin/content/view-aboutusImage', { content: content, fullName: req.session.firstName + " " + req.session.lastName });
});
router.get('/add-aboutusImage1', isAuth, isAdmin, function(req, res){
    res.render('admin/content/add-aboutusImage1', { fullName: req.session.firstName + " " + req.session.lastName });
});
router.post('/add-aboutusImage1', isAuth, isAdmin, upload.single('aboutUsImage1') ,async function(req, res){
    const result = await cloudinary.uploader.upload(req.file.path,{
        folder: "aboutUsImage",
    })
    const aboutUsImage = {
        image: {
                public_id: result.public_id,
                url: result.secure_url
        },
    };

    Content.findOneAndUpdate({ status: 'active' }, { $push: { aboutUsImage: [aboutUsImage] } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content/view-aboutusImage');
        }
    });
});
router.post('/delete-aboutusImage/:aboutusImageId', isAuth, isAdmin, function(req, res){
    const { aboutusImageId } = req.params;
    Content.findOneAndUpdate({ status: 'active' }, { $pull: { aboutUsImage: { _id: aboutusImageId } } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content/view-aboutusImage');
        }
    });
});

router.get('/view-faqs', isAuth, isAdmin, async (req, res) => {
    const content = await Content.findOne({ status: 'active' });
    res.render('admin/content/view-faqs', { content: content, fullName: req.session.firstName + " " + req.session.lastName });
});

router.get('/add-faqs', isAuth, isAdmin, async function(req, res){
    res.render('admin/content/add-faqs', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.post('/add-faqs', isAuth, isAdmin, function(req, res){
    const { question, answer } = req.body;

    console.log(req.body);

    const faq = {
        question: question,
        answer: answer
    };

    Content.findOneAndUpdate({ status: 'active' }, { $push: { faqs: [faq] } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content/view-faqs');
        }
    });
});

router.post('/delete-faq/:faqId', isAuth, isAdmin, function(req, res){
    const { faqId } = req.params;
    Content.findOneAndUpdate({ status: 'active' }, { $pull: { faqs: { _id: faqId } } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            var image = result.payment.find(item => item._id == paymentId);
            res.redirect('/admin/content/view-faqs');
        }
    });
});

router.get('/view-payment-details', isAuth, isAdmin, async (req, res) => {
    const content = await Content.findOne({ status: 'active' });
    res.render('admin/content/view-payment-details', { content: content, fullName: req.session.firstName + " " + req.session.lastName });
});

router.get('/add-payment-details', isAuth, isAdmin, function(req, res){
    res.render('admin/content/add-payment-details', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.post('/add-payment-details', isAuth, isAdmin, upload.single('qrCodeImage') ,async function(req, res){
    const { paymentName, userName, bankNumber } = req.body;
    const result = await cloudinary.uploader.upload(req.file.path,{
        folder: "qrCode",
    })
    const payment = {
        paymentName: paymentName,
        userName: userName, 
        bankNumber: bankNumber,
        qrCodeImage: {
                public_id: result.public_id,
                url: result.secure_url
        },
    };

    Content.findOneAndUpdate({ status: 'active' }, { $push: { payment: [payment] } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content/view-payment-details');
        }
    });
});

router.post('/delete-payment-details/:paymentId', isAuth, isAdmin, function(req, res){
    const { paymentId } = req.params;
    Content.findOneAndUpdate({ status: 'active' }, { $pull: { payment: { _id: paymentId } } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            var image = result.payment.find(item => item._id == paymentId);
            fs.unlinkSync('public/images/content/payment/' + image.qrCodeImage)
            res.redirect('/admin/content/view-payment-details');
        }
    });
});

router.post('/edit-text-:field', isAuth, isAdmin, function(req, res){
    const { newText } = req.body;
    const { field } = req.params
    Content.findOneAndUpdate({ status: 'active' }, { $set: { [field] : newText } }, function(err, result){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content');
        }
    });
});

router.get('/edit-image-homeImage', isAuth, isAdmin, function(req, res){
    res.render('admin/content/edit-image-home-content', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.get('/edit-image-aboutUsImage', isAuth, isAdmin, function(req, res){
    res.render('admin/content/edit-image-aboutus-content', { fullName: req.session.firstName + " " + req.session.lastName });
});

router.post('/edit-image-homeImage', isAuth, isAdmin, multipleUploadHome, function(req, res){
    const images = req.files;
    const imageArr = [images.homeImage1[0].filename, images.homeImage2[0].filename, images.homeImage3[0].filename];
    const imageObject = [
        { image: imageArr[0] },
        { image: imageArr[1] },
        { image: imageArr[2] }
    ];
    Content.findOneAndUpdate({ status: 'active' }, { $set : { homeImage: imageObject } }, function(err, result) {
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content');
        }
    });
});

router.post('/edit-image-aboutUsImage', isAuth, isAdmin, multipleUploadAboutUs, function(req, res){
    const images = req.files;
    const imageArr = [images.aboutUsImage1[0].filename, images.aboutUsImage2[0].filename, images.aboutUsImage3[0].filename];
    const imageObject = [
        { image: imageArr[0] },
        { image: imageArr[1] },
        { image: imageArr[2] }
    ];
    Content.findOneAndUpdate({ status: 'active' }, { $set : { aboutUsImage: imageObject } }, function(err, result) {
        if(err) {
            console.log(err);
        } else {
            res.redirect('/admin/content');
        }
    });
});

router.post('/add', isAuth, isAdmin,  function(req, res){
    const { homeText, aboutUsParagraph1, aboutUsParagraph2, aboutUsParagraph3, footerText, footerContactNumber, footerContactEmail } = req.body;

    // const images = req.files;
    // console.log(images)
    // const homeImageArr = [images.homeImage1[0].filename, images.homeImage2[0].filename, images.homeImage3[0].filename];
    // const aboutUsImageArr = [images.aboutUsImage1[0].filename, images.aboutUsImage2[0].filename, images.aboutUsImage3[0].filename];

   
    // const homeImageObject = [
    //     {image: homeImageArr[0] },
    //     {image: homeImageArr[1] },
    //     {image: homeImageArr[2] }
    // ];

    // const aboutUsImageObject = [
    //     {image: aboutUsImageArr[0] },
    //     {image: aboutUsImageArr[1] },
    //     {image: aboutUsImageArr[2] }
    // ];
    

    const content = new Content({
        status: 'active',
        homeText: homeText,
        aboutUsParagraph1: aboutUsParagraph1,
        aboutUsParagraph2: aboutUsParagraph2,
        aboutUsParagraph3: aboutUsParagraph3,
        footerText: footerText,
        footerContactNumber: footerContactNumber,
        footerContactEmail: footerContactEmail
    })

    content.save();

    res.redirect('/admin/content')
});

module.exports = router;
