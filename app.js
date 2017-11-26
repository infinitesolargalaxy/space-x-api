const express = require("express");

const bodyparser = require("body-parser");
const methodOverride = require("method-override");
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded ({extended: false}));
app.use(methodOverride("_method"));
app.use(cookeParser());

function logger(req, res, next){
    console.log("Cookie Parser: ", req.cookies)
    console.log("Signed Cookies: ", req.signedCookies)
    if (req.body){
        console.log ('LOG:', req.method, req.url.req.body)
    }
    next()
}

app.use(myLogger)
app.use(morgan('common'))

//restful api?
app.get();

app.post();

app.put();

app.delete();

app.listen(PORT, () => {
    console.log(`Sever listening on port ${PORT}`);
});