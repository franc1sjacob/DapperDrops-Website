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
        cb(null, file.fieldname + '_' + Date.now() + "_" + file.originalname)
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
}).single('productImage');



router.get("/", isAuth, isAdmin, async function (req, res) {   
    let { stype, sdir, ftype, fvalue } = req.query;
    const notification = await Notification.find({});
    if(!stype && !sdir && !ftype && !fvalue){
        products = await Product.aggregate([{
            $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            }
        }]);
    } else if (!stype && !sdir) {
        products = await Product.aggregate([
            { $match: {
                [ftype]: fvalue
            } },
            { $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate": {
                    $multiply: [ { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] }, 100 ]
                }
            } }
        ]);

        // products = await Product.find({ [ftype] : fvalue });
    } else if (!ftype && !fvalue) {
        console.log("ETOOOO 3")
        products = await Product.aggregate([
            { $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } },
            { $sort: {
                [stype] : parseInt(sdir)
            } }
        ]);

        console.log(products);
        // products = await Product.find({}).sort({ [stype] : sdir });
    } else {
        console.log("ETOOOO 4")
        products = await Product.aggregate([
            { $match: {
                [ftype]: fvalue
            } },
            { $project:{
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } },
            { $sort: {
                [stype] : parseInt(sdir)
            } }
        ]);
    }
    
    const brands = await Product.aggregate([
        { $group: {
            _id: {
                brand: "$brand"
            }
        } }
    ]).sort({ "_id.brand": 1 });
    
    res.render('admin/inventory', {
        newListInventory: products,
        notification: notification,
        brands: brands,
        stype: stype,
        sdir: sdir,
        ftype: ftype,
        fvalue: fvalue,
        fullName: req.session.firstName + " " + req.session.lastName})

});

router.get('/search-inventory', async function(req, res){
    let { stype, sdir } = req.query;
    let query = req.query.query;
    let searchedProducts, brands;

    if(!query) {
        query = "";
    }

    if(!stype || !sdir){
        searchedProducts = await Product.aggregate([
            { $match: 
                { $or: [
                    { name: { $regex: query, $options: 'i'} },
                    { brand: { $regex: query, $options: 'i'} },
                ] }
            },
            { $project: {
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate":  {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } }
        ]);
    } else {
        searchedProducts = await Product.aggregate([
            { $match: 
                { $or: [
                    { name: { $regex: query, $options: 'i'} },
                    { brand: { $regex: query, $options: 'i'} },
                ] }
            },
            { $project: {
                "category":"$category",
                "brand": "$brand",
                "name": "$name",
                "totalEarnings": "$totalEarnings",
                "totalQuantitySold": "$totalQuantitySold",
                "itemsRemaining":{
                    $sum: "$variations.quantity"
                },
                "totalAcquired": {
                    $sum: "$variations.stockAcquired"
                },
                "movementRate": {
                    $multiply: [ 
                        { $cond: 
                            [
                                { $ne: ["$totalQuantitySold", 0] },
                                { $divide: [ "$totalQuantitySold", { $sum: "$variations.stockAcquired" } ] },
                                0
                            ] 
                        }, 100 ]
                    }
            } },
            { $sort: {
                [stype] : parseInt(sdir)
            }}
        ]);
    }
    

    console.log(searchedProducts)

    res.render('admin/search-inventory', {
        newListInventory: searchedProducts,
        stype: stype,
        sdir: sdir,
        query: query,
        fullName: req.session.firstName + " " + req.session.lastName})
});

router.get("/:productId/inventoryview", isAuth, isAdmin, upload, function(req, res){
    const productId = req.params.productId;

    Product.findOne({ _id:productId }, function(err, allProducts){
        res.render('admin/view-inventoryProducts', { newListProducts:allProducts,
            fullName: req.session.firstName + " " + req.session.lastName
        });
    })
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
            req.session.message = {
                type:'success',
                message:'Product deleted successfully!'
            };      
            res.redirect('/admin/inventory')
        }
    
    });
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
            
            res.render('admin/update-variation-inventory', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.get("/:productId/add-new-variation-inventory", isAuth, isAdmin, function(req, res){
    const productId = req.params.productId;
    console.log(productId);
    Product.findOne({ _id:productId }, function(err, product){
        res.render('admin/add-new-variation-inventory', {
            fullName: req.session.firstName + " " + req.session.lastName,
             product:product
        });
    })
});

router.post("/:productId/add-new-variation-inventory", isAuth, isAdmin, async function(req, res){
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

let product = await Product.findOne({_id:productId,"variations.name": variation.name});
if(product){
    return res.render('admin/add-new-variation', { message: "The variation size you've entered is already existing.",  fullName: req.session.firstName + " " + req.session.lastName,
    product:product});
}   
   console.log(variation);
    Product.findByIdAndUpdate({"_id" : productId }, { $push: { 
        variations: [variation],
    }}, function(err, product){
        if(err){
            res.json({message: err.message, type: 'danger'})
        } else {           
            req.session.message = {
                type:'success',
                message:'Product variation added successfully!'
            };             
               res.redirect("/admin/inventory/"+productId+"/inventoryview")
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
            res.redirect("/admin/inventory/"+productId+"/inventoryview");
        }
    });
});
router.get("/add-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
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
            
            res.render('admin/add-quantity-variation-inventory', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.post("/add-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, function(req, res){
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
        } else {
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
                        message:result.brand + " "+ result.name +" Size "+ variationName +' quantity added successfully!'
                    };    
                    res.redirect("/admin/inventory/"+productId+"/inventoryview");
           }
            else if(origVariationQuantity + variationQuantity <= 5 &&  origVariationQuantity + variationQuantity >=1){
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
               res.redirect("/admin/inventory/"+productId+"/inventoryview");
           }
           else if(origVariationQuantity - variationQuantity == 0){
               const notif = new Notification({
                   productName: result.brand + " " + result.name, 
                   productVariation: variationName,
                   reason: "Out of stock",
                   category:"Out"
               });
               notif.save();
               req.session.message = {
                   type:'danger',
                   message: result.brand + " "+ result.name +" Size "+ variationName +' is Out of stock'
               };    
               res.redirect("/admin/inventory/"+productId+"/inventoryview");
           }
            log.save();
            
        }
    });
});
//NEWWWWWWWWWWWWWWWWWWWWWWWWWW

//NEWWWWWWWWWWWWWWWWWWWWW MINUS
router.get("/minus-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, upload, function(req, res){
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
            
            res.render('admin/minus-quantity-variation-inventory', {fullName: req.session.firstName + " " + req.session.lastName, product: product, variation: variation});
        }
    });     
});

router.post("/minus-quantity-variation-inventory/:variationId-:productId", isAuth, isAdmin, function(req, res){
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
            res.redirect("/admin/inventory/"+productId+"/inventoryview");
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
                res.redirect("/admin/inventory/"+productId+"/inventoryview");
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
                res.redirect("/admin/inventory/"+productId+"/inventoryview");
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
            res.redirect("/admin/inventory/"+productId+"/inventoryview");
        }
    });

});
router.post('/:notificationId/notif-delete', isAuth, isAdmin, function(req, res){
    const { notificationId } = req.params;
    Notification.findByIdAndRemove(   { _id: notificationId }  , function(err, result){
        if(err){
            res.json({message: err.message, type: 'danger'});
        }
        else{
            
            res.redirect('/admin/inventory');
        }
    });
});
module.exports = router;