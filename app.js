const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();
const port = 3000 || process.env.PORT;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:true
}));
app.use(express.static("public"));

//MongoDB
main().catch(err => console.log(err));

async function main(){
    await mongoose.connect('mongodb://localhost:27017/dapperdropsDB');
    console.log("Connected to db!");
}

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    password: {
        type: String,
        required: true
    },
    accountType: {
        type: String,
        required: true
    }
});

const secret = "francisjacobtaino.";
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema)

app.get("/", function(req, res){
    res.render('index');
});

app.get("/onhand", function(req, res){
    res.render('onhand');
});

app.get("/preorder", function(req, res){
    res.render('preorder');
});

app.get("/accessories", function(req, res){
    res.render('accessories');
});

app.get("/apparel", function(req, res){
    res.render('apparel');
});

app.get("/about", function(req, res){
    res.render('about');
});

app.get("/login", function(req, res){
    res.render('login');
});

app.post("/login", function(req, res){
    const userEmail = req.body.email;
    const userPassword = req.body.password;
    
    User.findOne({email: userEmail}, function(err, foundUser){
        if(err){
            console.log(err);
        } else {
            if(foundUser){
                if(foundUser.password === userPassword){
                    res.render('admin/dashboard');
                }
            }
        }});
});

app.get("/register", function(req, res){
    res.render('register');
});

app.post("/register", function(req, res){
    const userFirstName = req.body.firstName;
    const userLastName = req.body.lastName;
    const userEmail = req.body.email;
    const userPassword = req.body.password;

    const user = new User({
        firstName: userFirstName,
        lastName: userLastName,
        email: userEmail,
        password: userPassword,
        accountType: "user"
    });

    user.save(function(err){
        if(err){
            console.log(err);
        } else {
            res.render('admin/dashboard');
        }
    });

});


app.listen(port, function(){
    console.log("Server started on port " + port);
})
