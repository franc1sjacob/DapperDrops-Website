const express = require('express');
const router = express.Router();

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
}).single('productImage');


router.get("/", function (req, res) {   
    Product.find({}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/products', { newListProducts: allProducts })
        }
    });
});

router.get("/add-product", function(req, res){
    res.render('admin/add-product');
});

router.post("/addProduct", upload,function(req, res){
    const product = new Product({
        brand: req.body.productBrand,
        name: req.body.productName,
        price: req.body.productPrice,
        description: req.body.productDescription,
        quantity: req.body.productQuantity,
        image: req.file.filename,
        category: req.body.productType
    });
    
    product.save(function(err){
        if(err){
            console.log(err);
        }
        res.redirect("/admin/products");
    });
});

router.get("/:productId/edit", function(req, res){
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

router.post("/:productId", upload, function(req, res){
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

router.post("/delete-product/:deleteId", function(req, res){
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

router.get("/onhand-products", function(req, res){
    res.render('admin/onhand-products');
});

router.get("/preorder-products", function(req, res){
    res.render('admin/preorder-products');
});

router.get("/apparel-products", function(req, res){
    res.render('admin/apparel-products');
});

router.get("/accessories-products", function(req, res){
    res.render('admin/accessories-products');
});

router.get("/inventory", function(req, res){
    res.render('admin/inventory');
});

router.get("/orders", function(req, res){
    res.render('admin/orders');
});

module.exports = router;