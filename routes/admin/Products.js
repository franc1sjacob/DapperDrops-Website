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


router.get("/", isAuth, isAdmin, async function (req, res) {  
    const { stype, sdir, ftype, fvalue } = req.query;
    let products;
    
    if(!stype && !sdir && !ftype && !fvalue){
        products = await Product.find({});
    } else if (!stype && !sdir) {
        products = await Product.find({ [ftype] : fvalue });
    } else if (!ftype && !fvalue) {
        products = await Product.find({}).sort({ [stype] : sdir });
    } else {
        products = await Product.find({ [ftype] : fvalue }).sort({ [stype] : sdir });
    }

    const brands = await Product.aggregate([
        { $group: {
            _id: {
                brand: "$brand"
            }
        } }
    ]).sort({ "_id.brand": 1 });

    res.render('admin/products/products', {
        products: products,
        brands: brands,
        fullName: req.session.firstName + " " + req.session.lastName,
        stype: stype,
        sdir: sdir,
        ftype: ftype,
        fvalue: fvalue
    })
});

router.get('/search-products', async function(req, res){
    const { stype, sdir } = req.query; 
    let query = req.query.query;
    let searchedProducts, brands;

    if(!query) {
        query = "";
    }

    searchedProducts = await Product.find({
        $or: [
            { name: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } }
        ]
    }).sort({ [stype]: sdir });

    brands = await Product.aggregate([
        { $group: {
            _id: {
                brand: "$brand"
            }
        } }
    ]).sort({ "_id.brand": 1 });

    res.render("admin/products/search-products", {
        fullName: req.session.firstName + " " + req.session.lastName,
        products: searchedProducts,
        query: query,
        stype: stype,
        sdir: sdir,
    });
    
});

router.get('/category-:category', async function(req, res){
    const category = req.params.category;
    let products, categoryName;
    const { stype, sdir, ftype, fvalue } = req.query;

    console.log(category);

    if(category == 'onhand'){
        categoryName = 'On-Hand';
    } else if (category == 'preorder') {
        categoryName = 'Pre-Order';
    } else if (category == 'apparel') {
        categoryName = 'Apparel';
    } else if (category == 'accessories') {
        categoryName = 'Accessories';
    } else {
        res.redirect('/admin/products');
    }
    
    if(!stype && !sdir && !ftype && !fvalue){
        products = await Product.find({ category: categoryName });
    } else if (!stype && !sdir) {
        products = await Product.find({ category: categoryName, [ftype] : fvalue });
    } else if (!ftype && !fvalue) {
        products = await Product.find({ category: categoryName }).sort({ [stype] : sdir });
    } else {
        products = await Product.find({ category: categoryName, [ftype] : fvalue }).sort({ [stype] : sdir });
    }

    const brands = await Product.aggregate([
        { $match: { category: categoryName }},
        { $group: {
            _id: {
                brand: "$brand"
            }
        } }
    ]).sort({ "_id.brand": 1 });

    res.render('admin/products/product-category', {
        products: products,
        brands: brands,
        fullName: req.session.firstName + " " + req.session.lastName,
        stype: stype,
        sdir: sdir,
        ftype: ftype,
        fvalue: fvalue,
        categoryName: categoryName,
        category: category
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
    
    product.save(function(err){
        if(err){
            console.log(err);
        }
        
        var status = "";
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
    const { productId, name, quantity} = req.body;
    const variation = {
        name: name,
        quantity: quantity,
        status: ""
    };
    if(variation.quantity >= 6){
        variation.status = "In-Stock";
   }
   else if(variation.quantity <= 5 && variation.quantity >=1){
        variation.status = "Few-Stocks";
   }
   else if(variation.quantity == 0){
        variation.status = "Out-of-Stock";
   }
    Product.findByIdAndUpdate({ _id: req.session.productId }, { $push: { 
        variations: [variation]
    }}, function(err, product){
        if(err){
            console.log(err);
        } else {
           if(product.category == "On-Hand"){
            res.redirect('/admin/products/category-onhand')
           }
           else if(product.category == "Pre-Order"){
            res.redirect('/admin/products/category-preorder')
           }
           else if(product.category == "Apparel"){
            res.redirect('/admin/products/category-apparel')
           }
           else if(product.category == "Accessories"){
            res.redirect('/admin/products/category-accessories')
           }
            
        }
    });
});

router.get("/:productId/add-new-variation", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    console.log(productId);
    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/add-new-variation', {
            fullName: req.session.firstName + " " + req.session.lastName,
             product:product
        });
    })
});

router.post("/:productId/add-new-variation", isAuth, isAdmin, function(req, res){
    const {productId, name, quantity} = req.body;
    let status="";
    console.log(req.body);
    if(quantity >= 6){
        status = "In-Stock";
   }
   else if(quantity <= 5 && quantity >=1){
        status = "Few-Stocks";
   }
   else if(quantity == 0){
        status = "Out-of-Stock";
   }
   const variation = {
    name: name,
    quantity: quantity,
    status: status
};
   console.log(variation);
   Product.findByIdAndUpdate({"_id" : productId }, { $push: { 
    variations: [variation],
}}, function(err, product){
        if(err){
            console.log(err);
        } else {
            if(product.category == "On-Hand"){
                res.redirect('/admin/products/category-onhand')
               }
               else if(product.category == "Pre-Order"){
                res.redirect('/admin/products/category-preorder')
               }
               else if(product.category == "Apparel"){
                res.redirect('/admin/products/category-apparel')
               }
               else if(product.category == "Accessories"){
                res.redirect('/admin/products/category-accessories')
               }
        }
    });
});

router.get("/:productId/view", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, allProducts){
        res.render('admin/view-product', { newListProducts:allProducts,
            fullName: req.session.firstName + " " + req.session.lastName
        });
    })
});




router.post("/:productId", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;
    let variation = req.body['variation'];
    let newImage ="";
    

    if(req.file){
        newImage = req.file.filename;
        try{
            fs.unlinkSync('public/uploads/'+ req.body.productOldImage);
        } catch(err){
            console.log(err);
        }
    }else {
            newImage= req.body.productOldImage;
        }
    let status = '';
    if(req.body.productQuantity >= 6){
        status = "In-Stock";
   }
   else if(req.body.productQuantity <= 5 && req.body.productQuantity >=1){
        status = "Few-Stocks";
   }
   else if(req.body.productQuantity == 0){
        status = "Out-of-Stock";
   }
    
    Product.updateOne(
        {_id: productId},
        {$set:{
            brand: req.body.productBrand,
            name: req.body.productName,
            price: req.body.productPrice,
            description: req.body.productDescription,
            image: newImage,
            category: req.body.category
        }}, function(err, results){
            if(!err){
                if(req.body.category == "On-Hand"){
                    res.redirect('/admin/products/category-onhand')
                   }
                   else if(req.body.category == "Pre-Order"){
                    res.redirect('/admin/products/category-preorder')
                   }
                   else if(req.body.category == "Apparel"){
                    res.redirect('/admin/products/category-apparel')
                   }
                   else if(req.body.category == "Accessories"){
                    res.redirect('/admin/products/category-accessories')
                   }
            } else {
                console.log(err);
            }
        }
    ); 
    
});
router.get("/:productId/search", isAuth, isAdmin, function(req,res){
    console.log(req.params.key);
    resp.send("Search Done");
})

router.get("/:productId/delete", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    Product.findByIdAndRemove({ _id:productId }, function(err, result){
        if(result.image != ''){
            try{
                fs.unlinkSync('public/uploads/' + result.image)
            }catch(err){
                console.log(err)
            }
        }
        if(err){
            console.log(err);
        } else {
            console.log("Deleted!" + productId);
            if(result.category == "On-Hand"){
                res.redirect('/admin/products/category-onhand')
               }
               else if(result.category == "Pre-Order"){
                res.redirect('/admin/products/category-preorder')
               }
               else if(result.category == "Apparel"){
                res.redirect('/admin/products/category-apparel')
               }
               else if(result.category == "Accessories"){
                res.redirect('/admin/products/category-accessories')
               }
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
            fullName: req.session.firstName + " " + req.session.lastName
        });
    })
});

router.get("/update-variation/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    console.log(variationId);

    Product.findById({_id: productId}, function(err, product){
        if(err){
            console.log(err);
        }
        else{
            const variation = product.variations.find(obj => obj.id === variationId);
            console.log(variation);
            
            res.render('admin/update-variation', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.post("/update-variation/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    console.log(variationId);
    let status="";
    const {variationName, variationQuantity} = req.body;
    if(variationQuantity >= 6){
        status = "In-Stock";
   }
   else if(variationQuantity <= 5 && variationQuantity >=1){
        status = "Few-Stocks";
   }
   else if(variationQuantity == 0){
        status = "Out-of-Stock";
   }

    const conditions = {
        _id: productId,
        'variations._id': {$eq: variationId}
    };

    const update = {
        $set:{
            'variations.$.name': variationName,
            'variations.$.quantity': variationQuantity,
            'variations.$.status': status
        }
    }

	Product.findOneAndUpdate(conditions, update, function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/admin/products/"+productId+"/view");
        }
    });
});

router.get("/delete-variation/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    console.log(variationId);
    let status="";
    const {variationName, variationQuantity} = req.body;

    const conditions = {
        _id: productId,
        // 'variations._id': {$eq: variationId}
    };

    const remove = {
        $pull: { 
            variations: {
                _id: { $in: variationId}
            } 
            
          }
    }

	Product.updateOne(conditions, remove, function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/admin/products/"+productId+"/view");
        }
    });
});

router.get("/inventory", isAuth, isAdmin, function(req, res){
    res.render('admin/inventory', {fullName: req.session.firstName + " " + req.session.lastName});
});

module.exports = router;