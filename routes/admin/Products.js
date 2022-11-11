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
}).single('image');


router.get("/", isAuth, isAdmin, function (req, res) {   
    Product.find({category:"On-Hand"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/onhand-products', { newOnHandProducts: allProducts, fullName: req.session.firstName + " " + req.session.lastName })
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
        
        var status = "";
            const inventory = new Inventory({
                sales: 0,
                sold: 0,
                productId: product._id
            })

            inventory.save(function(err){
                if(err){
                    console.log(err);
                }
            })
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
            res.redirect('/admin/products/onhand-products')
           }
           else if(product.category == "Pre-Order"){
            res.redirect('/admin/products/preorder-products')
           }
           else if(product.category == "Apparel"){
            res.redirect('/admin/products/apparel-products')
           }
           else if(product.category == "Accessories"){
            res.redirect('/admin/products/accessories-products')
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
                res.redirect('/admin/products/onhand-products')
               }
               else if(product.category == "Pre-Order"){
                res.redirect('/admin/products/preorder-products')
               }
               else if(product.category == "Apparel"){
                res.redirect('/admin/products/apparel-products')
               }
               else if(product.category == "Accessories"){
                res.redirect('/admin/products/accessories-products')
               }
        }
    });


    
});

router.get("/:productId/edit", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/update-product', {
            fullName: req.session.firstName + " " + req.session.lastName,
            _id: productId,
            brand: product.brand,
            name: product.name,
            price: product.price,
            description: product.description,
            quantity: product.variations[0].quantity,
            image: product.image,
            category: product.category,
        });
    })
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
    console.log(productId);
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
            variations:{
                name:req.body.productName,
                quantity: req.body.productQuantity,
                status:status,
            },
            image: newImage,
            category: req.body.category
        }}, function(err, results){
            if(!err){
                if(req.body.category == "On-Hand"){
                    res.redirect('/admin/products/onhand-products')
                   }
                   else if(req.body.category == "Pre-Order"){
                    res.redirect('/admin/products/preorder-products')
                   }
                   else if(req.body.category == "Apparel"){
                    res.redirect('/admin/products/apparel-products')
                   }
                   else if(req.body.category == "Accessories"){
                    res.redirect('/admin/products/accessories-products')
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
                res.redirect('/admin/products/onhand-products')
               }
               else if(result.category == "Pre-Order"){
                res.redirect('/admin/products/preorder-products')
               }
               else if(result.category == "Apparel"){
                res.redirect('/admin/products/apparel-products')
               }
               else if(result.category == "Accessories"){
                res.redirect('/admin/products/accessories-products')
               }
        }
    });
});

router.get("/:variationId/update-variation", isAuth, isAdmin, upload, function(req, res){
    const variationId = req.params.variationId;

    Product.findOne({ _id:variationId }, function(err, variation){
        res.render('admin/update-variation', {
            fullName: req.session.firstName + " " + req.session.lastName, 
            _id: variationId,     
            name: variation.name,
            quantity: variation.quantity
        });
    })
});
router.post("/:productId/delete-variation", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    Product.findById({ _id:productId },
        {$pull:{
        _id: productId,
        }
    },function(err){
        if(err){
            console.log(err);
        } else {
            console.log("Deleted!" + productId);
            res.redirect('/admin/products/onhand-products')
               
        }
    });
});


router.get("/onhand-products", isAuth, isAdmin, function(req, res){
    Product.find({category:"On-Hand"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/onhand-products', {fullName: req.session.firstName + " " + req.session.lastName, newOnHandProducts: allProducts});
        }
    });
});

router.get("/preorder-products", isAuth, isAdmin, function(req, res){
    Product.find({category:"Pre-Order"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
        res.render('admin/preorder-products', {fullName: req.session.firstName + " " + req.session.lastName,  newPreOrderProducts: allProducts});
        }
    });
});

router.get("/apparel-products", isAuth, isAdmin, function(req, res){
    Product.find({category:"Apparel"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
    res.render('admin/apparel-products', {fullName: req.session.firstName + " " + req.session.lastName, newApparelProducts:allProducts});
        }
    });
});

router.get("/accessories-products", isAuth, isAdmin, function(req, res){
    Product.find({category:"Accessories"}, function (err, allProducts) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/accessories-products', {fullName: req.session.firstName + " " + req.session.lastName, newAccessoriesProducts: allProducts});
        }
    });
});

router.get("/inventory", isAuth, isAdmin, function(req, res){
    res.render('admin/inventory', {fullName: req.session.firstName + " " + req.session.lastName});
});

module.exports = router;