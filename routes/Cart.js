const express = require('express');
const router = express.Router();

const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const { ObjectID } = require('bson');


router.get("/view-cart", function(req, res){
    Cart.find({}, function(err, foundCarts){
        if(err){
            console.log(err);
        } else{
            res.render('view-cart', {userCart:foundCarts});
        }
    });
});

router.post("/add-to-cart", function(req, res){
    const prodId = req.body.prodId; 
    console.log(prodId);
    Product.findById(prodId, function(err, foundProduct){
        if(err){
            console.log(err);
        } else{
            const cart = new Cart({
                products: [{
                    productId: foundProduct._id,
                    name: foundProduct.name,
                    brand: foundProduct.brand,
                    category: foundProduct.category,
                    quantity: 1,
                    price: foundProduct.price
                }],
                total: foundProduct.price
            });
            
            cart.save(function(err){
                if(err){
                    console.log(err);
                }
                res.redirect('/cart/view-cart');
            });
        }
    });
});

module.exports = router;