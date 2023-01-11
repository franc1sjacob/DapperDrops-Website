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
const Featured = require("../../models/featuredModel");
const Log = require("../../models/logModel");
const Notification = require("../../models/notificationModel");

var fs = require('fs');
var path = require('path');

const multer = require("multer")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '' + Date.now() + "" + file.originalname)
    }
});
  

const upload = multer({
    storage: storage, 
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.jfif') {
            return callback(new Error('Only images are allowed'))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 * 1024
    }
}).single('image');

const cloudinary = require('cloudinary').v2;

// cloudinary.config({ 
//     cloud_name: 'dupbncewr', 
//     api_key: '269958243189147', 
//     api_secret: 'C5UUJnq3B9G0Sfi8poTWl1AgKCY' 
//   });



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

router.post("/add-product", isAuth, isAdmin, upload, async function(req, res){
    const productId = new mongoose.Types.ObjectId();
    const { brand, name, price, description, image, category } = req.body;

    const result = await cloudinary.uploader.upload(req.file.path,{
        folder: "products",
    })

    const product = new Product({
        _id: productId,
        brand: brand,
        name: name,
        price: price,
        description: description,
        image: {
            public_id: result.public_id,
            url: result.secure_url
        },
        category: category
    });
    
    product.save(function(err){
        if(err){
            console.log(err);
        }
        
        const log = new Log({
            productName: brand + " " + name, 
            user: req.session.firstName + " " + req.session.lastName,
            action: "added a new product",
            category: "add"
        });
        log.save();
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
        status: "",
        stockAcquired: quantity
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
            res.json({message: err.message, type: 'danger'})
        } else {
           if(product.category == "On-Hand"){
            req.session.message = {
                type:'success',
                message:'Product added successfully!'
            };       
             res.redirect('/admin/products/category-onhand')    
             }
           else if(product.category == "Pre-Order"){
            req.session.message = {
                type:'success',
                message:'Product added successfully!'
            };       
            res.redirect('/admin/products/category-preorder')
           }
           else if(product.category == "Apparel"){
            req.session.message = {
                type:'success',
                message:'Product added successfully!'
            };       
            res.redirect('/admin/products/category-apparel')
           }
           else if(product.category == "Accessories"){
            req.session.message = {
                type:'success',
                message:'Product added successfully!'
            };       
            res.redirect('/admin/products/category-accessories')
           }
            
        }
    });
});

router.get("/:productId/add-to-featured", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    console.log(productId);
    Product.findOne({ _id: productId }, function(err, product){
        res.render('admin/products/add-to-featured', {
            fullName: req.session.firstName + " " + req.session.lastName,
            product: product
        });
    })
});

router.post("/:productId/add-to-featured", isAuth, isAdmin, async function(req, res, err){
    const productId = req.params.productId;

    const featured = new Featured({ productId: productId })
    featured.save()
        req.session.message = {
            type:'success',
            message:'Product added to featured successfully!'
        };      
    res.redirect('/admin/products')

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

router.post("/:productId/add-new-variation", isAuth, isAdmin, async function(req, res){
    const {productId, name, quantity} = req.body;
    let status="";
    const variations = "";
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
    status: status,
    stockAcquired: quantity
};
let product = await Product.findOne({_id:productId,"variations.name": variation.name});
if(product){
    return res.render('admin/add-new-variation', { message: "The variation size you've entered is already existing.",  fullName: req.session.firstName + " " + req.session.lastName,
    product:product});
}   
   

    
//    console.log(variation);
    Product.findByIdAndUpdate({"_id" : productId }, { $addToSet: { 
        variations: [variation], 
    }}, function(err, product){
            if(err){
                res.json({message: err.message, type: 'danger'})
            } else {           
                req.session.message = {
                    type:'success',
                    message:'Product variation added successfully!'
                };    
               res.redirect("/admin/products/"+productId+"/view")
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
            image: product.image.url,
            category: product.category,
            fullName: req.session.firstName + " " + req.session.lastName
        });
    })
});




router.post("/:productId", isAuth, isAdmin, upload, async function(req, res){
    const productId = req.params.productId;
    let newImage ="";
    

    if(req.file){
        const result = await cloudinary.uploader.upload(req.file.path,{
            folder: "products",
        })
        newImage = result.url;
        try{
            //fs.unlinkSync('public/uploads/'+ req.body.productOldImage);
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
            image: {
                url: newImage
            },
            category: req.body.category
        }}, function(err, results){
            if(!err){
                const log = new Log({
                    productName: req.body.productBrand + " " + req.body.productName, 
                    user: req.session.firstName + " " + req.session.lastName,
                    action: "edited product",
                    reason: req.body.reason,
                    category: "edit"
                });
                log.save();

                if(req.body.category == "On-Hand"){
                    req.session.message = {
                        type:'success',
                        message:'Product updated successfully!'
                    };      
                    res.redirect('/admin/products/category-onhand')
                   }
                   else if(req.body.category == "Pre-Order"){
                    req.session.message = {
                        type:'success',
                        message:'Product updated successfully!'
                    };     
                    res.redirect('/admin/products/category-preorder')
                   }
                   else if(req.body.category == "Apparel"){
                    req.session.message = {
                        type:'success',
                        message:'Product updated successfully!'
                    };      
                    res.redirect('/admin/products/category-apparel')
                   }
                   else if(req.body.category == "Accessories"){
                    req.session.message = {
                        type:'success',
                        message:'Product updated successfully!'
                    };      
                    res.redirect('/admin/products/category-accessories')
                   }
            } else {
                res.json({message: err.message, type: 'danger'})
            }
        }
    ); 
    
});


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
            res.json({message: err.message, type: 'danger'})
        } else {
            const log = new Log({
                productName: result.brand + " " + result.name, 
                user: req.session.firstName + " " + req.session.lastName,
                action: "deleted product",
                category: "delete"
            });
            log.save();
            console.log("Deleted!" + productId);
            if(result.category == "On-Hand"){
                req.session.message = {
                    type:'success',
                    message:'Product deleted successfully!'
                }      
                res.redirect('/admin/products/category-onhand')
               }
               else if(result.category == "Pre-Order"){
                req.session.message = {
                    type:'success',
                    message:'Product deleted successfully!'
                }      
                res.redirect('/admin/products/category-preorder')
               }
               else if(result.category == "Apparel"){
                req.session.message = {
                    type:'success',
                    message:'Product deleted successfully!'
                }      
                res.redirect('/admin/products/category-apparel')
               }
               else if(result.category == "Accessories"){
                req.session.message = {
                    type:'success',
                    message:'Product deleted successfully!'
                };      
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
            image: product.image.url,
            category: product.category,
            fullName: req.session.firstName + " " + req.session.lastName
        });
    })
});

router.get("/update-variation/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    
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

router.post("/update-variation/:variationId-:productId", isAuth, isAdmin, async function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    const { variationName, reason } = req.body;

let product = await Product.findOne({_id:productId,"variations.name": variationName});
if(product){
    req.session.message = {
        type:'danger',
        message:"The variation size you've entered is already existing."
    };  
     return res.redirect('/admin/products/update-variation/'+ variationId +'-'+ productId);
}

    const conditions = {
        _id: productId,
        'variations._id': {$eq: variationId}
    };

    const update = {
        $set:{
            'variations.$.name': variationName,
        }
    }

	Product.findOneAndUpdate(conditions, update, function(err, result){
        if(err){
            res.json({message: err.message, type: 'danger'});
        }
        else{
            const log = new Log({
                productName: result.brand + " " + result.name, 
                user: req.session.firstName + " " + req.session.lastName,
                action: "edited product variation name of",
                reason: reason,
                category: "edit"
            });
            log.save();
            req.session.message = {
                type:'success',
                message:'Product variation updated successfully!'
            };    
            res.redirect("/admin/products/"+productId+"/view");
        }
    });
});


//NEWWWWWWWWWWWWWWWWWWWWWWW ADD
router.get("/add-quantity-variation/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
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
            
            res.render('admin/products/add-quantity-variation', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.post("/add-quantity-variation/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    const { variationQuantity, origVariationQuantity, variationName, reason } = req.body;
    console.log(variationId);
    let status="";
    
    if(origVariationQuantity + variationQuantity >= 6){
        status = "In-Stock";
    }
    else if(origVariationQuantity + variationQuantity <= 5 && origVariationQuantity + variationQuantity >=1){
        status = "Few-Stocks";
    }
    else if(origVariationQuantity + variationQuantity== 0){
        status = "Out-of-Stock";
    }
    const conditions = {
        _id: productId,
        'variations._id': {$eq: variationId}
    };

    const update = {
        $inc: {
            // 'variations.$.name': variationName,
            'variations.$.quantity': variationQuantity,
            'variations.$.stockAcquired': variationQuantity,
            // 'variations.$.status': status
        },
        $set: {
            'variations.$.status': status
        }
    }

	Product.findOneAndUpdate(conditions, update, function(err, result){
        if(err){
            res.json({message: err.message, type: 'danger'});
        }
        else{
            const log = new Log({
                productName: result.brand + " " + result.name, 
                user: req.session.firstName + " " + req.session.lastName,
                action: "added " + variationQuantity + " stocks for product variation: " + variationName + ", ",
                reason: reason,
                category: "edit"
            });
            
            if(origVariationQuantity + variationQuantity >= 6){
                const notif = new Notification({
                    productName: result.brand + " " + result.name, 
                    productVariation: variationName,
                    reason: "Stock has been replenished",
                    category: "Replenished"
                });
                notif.save();
                req.session.message = {
               type:'success',
               message:'Product quantity added successfully!'
           };    
           res.redirect("/admin/products/"+productId+"/view");
           }
            else if(origVariationQuantity + variationQuantity <= 5 &&  origVariationQuantity + variationQuantity >=1){
               const notif = new Notification({
                   productName: result.brand + " " + result.name, 
                   productVariation: variationName,
                   reason: "Stock is still at Critical Level",
                   category: "Few"
               });
               notif.save();
               req.session.message = {
                   type:'danger',
                   message:result.brand + " "+ result.name +" Size "+ variationName +' is at critical level'
               };    
               res.redirect("/admin/products/"+productId+"/view");
           }
           else if(origVariationQuantity - variationQuantity == 0){
               const notif = new Notification({
                   productName: result.brand + " " + result.name, 
                   productVariation: variationName,
                   reason: "Out of stock",
                   category: "Out"
               });
               notif.save();
               req.session.message = {
                   type:'danger',
                   message: result.brand + " "+ result.name +" Size "+ variationName +' is Out of stock'
               };    
               res.redirect("/admin/products/"+productId+"/view");
           }
            log.save();
            
        }
    });
});
//NEWWWWWWWWWWWWWWWWWWWWWWWWWW

//NEWWWWWWWWWWWWWWWWWWWWW MINUS
router.get("/minus-quantity-variation/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
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
            
            res.render('admin/products/minus-quantity-variation', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.post("/minus-quantity-variation/:variationId-:productId", isAuth, isAdmin, function(req, res){
    const variationId = req.params.variationId;
    const productId = req.params.productId;
    const { variationQuantity, origVariationQuantity, variationName, reason } = req.body;
    console.log(variationId);
    let status="";
    
    if(origVariationQuantity - variationQuantity >= 6){
        status = "In-Stock";
    }
    else if(origVariationQuantity - variationQuantity <= 5 && origVariationQuantity - variationQuantity >=1){
        status = "Few-Stocks";
    }
    else if(origVariationQuantity - variationQuantity == 0){
        status = "Out-of-Stock";
    }

    console.log(status)

    const conditions = {
        _id: productId,
        'variations._id': {$eq: variationId}
    };

    const update = {
        $inc: {
            // 'variations.$.name': variationName,
            'variations.$.quantity': -variationQuantity,
            'variations.$.stockAcquired': -variationQuantity,
            // 'variations.$.status': status
        },
        $set: {
            'variations.$.status': status
        }
    }

	Product.findOneAndUpdate(conditions, update, function(err, result){
        if(err){
            res.json({message: err.message, type: 'danger'});
        } else {
            const log = new Log({
                productName: result.brand + " " + result.name, 
                user: req.session.firstName + " " + req.session.lastName,
                action: "subtracted " + variationQuantity + " stocks for product variation: " + variationName + ", ",
                reason: reason,
                category: "edit"
            });
            if(origVariationQuantity - variationQuantity >= 6){
                 req.session.message = {
                type:'success',
                message:'Product quantity subtracted successfully!'
            };    
            res.redirect("/admin/products/"+productId+"/view");
            }
             else if(origVariationQuantity - variationQuantity <= 5 &&  origVariationQuantity - variationQuantity >=1){
                const notif = new Notification({
                    productName: result.brand + " " + result.name, 
                    productVariation: variationName,
                    reason: "Stock is at Critical Level",
                    category: "Few"
                });
                notif.save();
                req.session.message = {
                    type:'danger',
                    message:result.brand + " "+ result.name +" Size "+ variationName +' is at critical level'
                };    
                res.redirect("/admin/products/"+productId+"/view");
            }
            else if(origVariationQuantity - variationQuantity == 0){
                const notif = new Notification({
                    productName: result.brand + " " + result.name, 
                    productVariation: variationName,
                    reason: "Out of stock",
                    category: "Out"
                });
                notif.save();
                req.session.message = {
                    type:'danger',
                    message: result.brand + " "+ result.name +" Size "+ variationName +' is Out of stock'
                };    
                res.redirect("/admin/products/"+productId+"/view");
            }
            log.save();
        }
    });
});
//NEWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW

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
            res.json({message: err.message, type: 'danger'});
        }
        else{
            req.session.message = {
                type:'success',
                message:'Product variation deleted successfully!'
            };
            res.redirect("/admin/products/"+productId+"/view");
        }
    });
});

router.get("/inventory", isAuth, isAdmin, function(req, res){
    res.render('admin/inventory', {fullName: req.session.firstName + " " + req.session.lastName});
});

module.exports = router;