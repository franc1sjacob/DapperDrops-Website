const express = require('express'),
    bodyParser = require('body-parser'),
    ejs = require('ejs'),
    app = express(),
    port = 3000 || process.env.PORT;

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", function(req, res){
    res.render('index');
});

//NAVBAR LINKS START
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

app.get("/register", function(req, res){
    res.render('register');
});
//NAVBAR LINKS END


app.listen(port, function(){
    console.log("Server started on port " + port);
})
