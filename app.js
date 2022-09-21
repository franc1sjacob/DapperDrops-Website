const express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    port = 3000 || process.env.PORT;

app.use(express.static("public"));

app.get("/", function(req, res){
    res.sendFile(__dirname + "/index.html");
});

app.listen(port, function(){
    console.log("Server started on port " + port);
})
