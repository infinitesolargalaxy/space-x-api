const express = require("express");

const bodyparser = require("body-parser");
const methodOverride = require("method-override");
const morgan = require('morgan');
//const cookieParser = require('cookie-parser');

var MongoClient = require('mongodb').MongoClient
var url = "mongodb://USER:PWD@ds117316.mlab.com:17316/csc309db"

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded ({extended: false}));
app.use(methodOverride("_method"));
//app.use(cookeParser());

function logger(req, res, next){
    console.log("Cookie Parser: ", req.cookies)
    console.log("Signed Cookies: ", req.signedCookies)
    if (req.body){
        console.log ('LOG:', req.method, req.url.req.body)
    }
    next()
}

//Just creates database
//Should probably not use "Teamundefined" as name for database, one of us may have used it for tutorial
MongoClient.connect(url, function(err,res){
	if(err) console.log(err)
	console.log("Database created");
	db = res								
});


app.use(myLogger)
app.use(morgan('common'))

//restful api?
app.get();

app.post();

app.put();

app.delete();

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

