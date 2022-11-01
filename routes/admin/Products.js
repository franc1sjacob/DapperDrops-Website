const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

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

const Product = require("../../models/productModel");

var fs = require('fs');
var path = require('path');

const multer = require("multer")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now() + "_" + file.originalname)
    }
});
  

const upload = multer({
    storage: storage, 
}).single('image');


router.get("/", isAuth, isAdmin, function (req, res) {   
    Product.find({}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/products', { newListProducts: allProducts, fullName: req.session.firstName + " " + req.session.lastName })
        }
    });
});

router.get("/add-product", isAuth, isAdmin, function(req, res){
    res.render('admin/add-product', {fullName: req.session.firstName + " " + req.session.lastName});
});

router.post("/add-product", isAuth, isAdmin, upload, function(req, res){
    const productId = new mongoose.Types.ObjectId();
    const { brand, name, price, description, category } = req.body;

    const product = new Product({
        _id: productId,
        brand: brand,
        name: name,
        price: price,
        description: description,
        image: req.file.filename,
        category: category
    });

    // const product = new Product({
    //     brand: req.body.productBrand,
    //     name: req.body.productName,
    //     price: req.body.productPrice,
    //     description: req.body.productDescription,
    //     quantity: req.body.productQuantity,
    //     image: req.file.filename,
    //     category: req.body.productType
    // });
    
    product.save(function(err){
        if(err){
            console.log(err);
        }
        console.log("Product ID:");
        console.log(productId);
        req.session.productId = productId;
        res.redirect("/admin/products/add-variations");
    });
});

router.get("/add-variations", isAuth, isAdmin, function(req, res){
    res.render('admin/add-variations', { productId: req.session.productId, fullName: req.session.firstName + " " + req.session.lastName });
});

router.post("/add-variations", isAuth, isAdmin, function(req, res){
    const { productId, name, quantity } = req.body;
    const variation = {
        name: name,
        quantity: quantity
    };

    Product.findByIdAndUpdate({ _id: req.session.productId }, { $push: { 
        variations: [variation]
    }}, function(err){
        if(err){
            console.log(err);
        } else {
            res.redirect('/admin/products')
        }
    });

});

router.get("/:productId/edit", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/update-product', {
            _id: productId,
            brand: product.brand,
            name: product.name,
            price: product.price,
            description: product.description,
            quantity: product.quantity,
            image: product.image,
            category: product.category,
        });
    })
});

router.post("/:productId", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;
    console.log(productId);
    Product.updateOne(
        {_id: productId},
        {$set:{
            brand: req.body.productBrand,
            name: req.body.productName,
            price: req.body.productPrice,
            description: req.body.productDescription,
            quantity: req.body.productQuantity,
            image: req.file.filename,
            category: req.body.productType
        }}, function(err, results){
            if(!err){
                res.redirect("/admin/products");
            } else {
                console.log(err);
            }
        }
    ); 
    
});

router.post("/delete-product/:deleteId", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    Product.findByIdAndRemove({ _id:productId }, function(err, user){
        if(err){
            console.log(err);
        } else {
            console.log("Deleted!" + productId);
            res.redirect("/admin/products");
        }
    });
});

router.get("/onhand-products", isAuth, isAdmin, function(req, res){
    res.render('admin/onhand-products', {fullName: req.session.firstName + " " + req.session.lastName});
});

router.get("/preorder-products", isAuth, isAdmin, function(req, res){
    res.render('admin/preorder-products', {fullName: req.session.firstName + " " + req.session.lastName});
});

router.get("/apparel-products", isAuth, isAdmin, function(req, res){
    res.render('admin/apparel-products', {fullName: req.session.firstName + " " + req.session.lastName});
});

router.get("/accessories-products", isAuth, isAdmin, function(req, res){
    res.render('admin/accessories-products', {fullName: req.session.firstName + " " + req.session.lastName});
});

router.get("/inventory", isAuth, isAdmin, function(req, res){
    res.render('admin/inventory', {fullName: req.session.firstName + " " + req.session.lastName});
});

router.get("/orders", isAuth, isAdmin, function(req, res){
    res.render('admin/orders', {fullName: req.session.firstName + " " + req.session.lastName});
});

module.exports = router;