const express = require('express');
const router = express.Router();

const Product = require("../../models/productModel");
const Inventory = require("../../models/inventoryModel");

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
router.get("/", function(req, res){
    Product.find({type:"Apparel"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("admin/apparel-products", { newApparelProducts: allProducts })
        }
    });
});

module.exports = router;