const express = require('express');
const router = express.Router();

const Product = require("../models/productModel");
const Wishlist = require("../models/wishlistModel");

router.get("/onhand", function(req, res){
    Product.find({category:"On-Hand"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("onhand", { newOnHandProducts: allProducts })
        }
    });
});

router.get("/preorder", function(req, res){
    Product.find({category:"Pre-Order"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("preorder", { newPreOrderProducts: allProducts })
        }
    });
});

router.get("/accessories", function(req, res){
    Product.find({category:"Accessories"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("accessories", { newAccessoriesProducts: allProducts })
        }
    });
});

router.get("/apparel", function(req, res){
    Product.find({category:"Apparel"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render("apparel", { newApparelProducts: allProducts })
        }
    });
});

router.get("/item/:productId", function(req, res){
    const productId = req.params.productId;
    const userId = req.session.userId;

    Product.findOne({_id:productId}, function(err, item){
        res.render('view-item', {item: item, userId: userId});
    });
});


router.post('/add-to-wishlist', isAuth, function(req, res){
    userId = req.session.userId;
    const { prodId } = req.body;

    Product.findOne({ _id: prodId }, function(err, product){

        newProduct = {
            productId: prodId,
            image: product.image,
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: product.price
        }
        const conditions = {
            userId: userId,
            'products.productId': { $ne: prodId }
        };

        const update = {
            $push: { products: newProduct }
        };

        Wishlist.findOneAndUpdate(conditions, update, function(err, wishlist){
            if(err){
                console.log(err);
            } else {
                res.redirect('/products/item/' + prodId);
            }
        });
    });
})
module.exports = router;