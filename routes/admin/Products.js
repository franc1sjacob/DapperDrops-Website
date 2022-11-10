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
    }}, function(err){
        if(err){
            console.log(err);
        } else {
           
            res.redirect('/admin/products')
        }
    });



    
});

router.get("/add-new-variation", isAuth, isAdmin, function(req, res){
    res.render('admin/add-new-variation', {productId: req.session.productId, fullName: req.session.firstName + " " + req.session.lastName });
});

router.post("/add-new-variation", isAuth, isAdmin, function(req, res){
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
   Product.findByIdAndUpdate({ productId }, { $push: { 
    variations: [variation]
}}, function(err){
        if(err){
            console.log(err);
        } else {
           
            res.redirect('/admin/products')
        }
    });



    
});

router.get("/:productId/edit", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/update-product', {
            fullName: req.session.firstName + " " + req.session.lastName,            _id: productId,
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

    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/view-product', {
            fullName: req.session.firstName + " " + req.session.lastName,            _id: productId,
            brand: product.brand,
            name: product.name,
            price: product.price,
            description: product.description,
            vname: product.variations[0].name,
            quantity: product.variations[0].quantity,
            image: product.image,
            category: product.category,
        });
    })
});



router.get("/:productId/edit", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/update-product', {
            fullName: req.session.firstName + " " + req.session.lastName,            _id: productId,
            brand: product.brand,
            name: product.name,
            price: product.price,
            description: product.description,
            vname: product.variations[0].name,
            quantity: product.variations[0].quantity,
            image: product.image,
            category: product.category,
        });
    })
});

router.get("/:productId/view", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/view-product', {
            fullName: req.session.firstName + " " + req.session.lastName,            _id: productId,
            brand: product.brand,
            name: product.name,
            price: product.price,
            description: product.description,
            vname: product.variations[0].name,
            quantity: product.variations[0].quantity,
            image: product.image,
            category: product.category,
            fullName: req.session.firstName + " " + req.session.lastName
        });
    })
});

router.post("/:productId", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;
    console.log(productId);
    let variation = req.body['variation'];
    let inputValue = req.body['test']; 
    let checkedValue = req.body['box1']; 
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
                if(checkedValue){   
                    console.log("Product ID:");
                    console.log(productId);
                    req.session.productId = productId;
                    res.redirect("/admin/products/add-new-variation");
                }
                else{
                    res.redirect("/admin/products");
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
            res.redirect("/admin/products");
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