const express = require('express');
const router = express.Router();

const Product = require("../models/productModel");
const Wishlist = require("../models/wishlistModel");

const isAuth = function(req, res, next){
    if(req.session.isAuth){
        next();
    } else {
        res.redirect('/account/login');
    }
}

router.get('/search', async function(req, res) {
    let searchQuery = req.query.query;

    if(!searchQuery) {
        searchQuery = "";
    }

    const stype = req.query.stype;
    const sdir = req.query.sdir;

    const searchedProducts = await Product.find({
        $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { brand: { $regex: searchQuery, $options: "i" } }
        ]
    }).sort({ [stype]: sdir });

    console.log(searchedProducts);

    res.render("search", { products: searchedProducts,
        query: searchQuery,
        stype: stype,
        sdir: sdir
    });
});

router.get("/:category", async function(req, res){
    let products;
    let category = req.params.category;

    if(category == 'onhand'){
        category = 'On-Hand';
    } else if (category == 'preorder') {
        category = 'Pre-Order';
    } else if (category == 'accessories') {
        category = 'Accessories';
    } else if (category == 'apparel') {
        category ='Apparel';
    } else {
        res.redirect('/')
    }

    const { stype, sdir, ftype, fvalue } = req.query;

    if(!ftype || !fvalue){
        products = await Product.find({ category: category }).sort({ [stype]: sdir });
    } else if (!stype || !sdir) {
        products = await Product.find({ category: category, [ftype]: fvalue }).sort({ [stype]: sdir });
    }

    const brands = await Product.aggregate([
        { $group: {
            _id: {
                brand: "$brand"
            }
        } }
    ]).sort({ "_id.brand": 1 });

    res.render("view-products", {
        products: products,
        brands: brands,
        stype: stype, 
        sdir: sdir,
        ftype: ftype,
        fvalue: fvalue,
        category: category
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