const express = require("express");
const request = require('request')
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const morgan = require('morgan');
//const cookieParser = require('cookie-parser');

var MongoClient = require('mongodb').MongoClient
var url = "mongodb://csc309f:csc309fall@ds117316.mlab.com:17316/csc309db"

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded ({extended: false}));
app.use(methodOverride("_method"));
//app.use(cookieParser());

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
//Format for database is: userName, password, vehicles, launches, launchpads
var db
MongoClient.connect(url, function(err,res){
	if(err) console.log(err)
	console.log("Database created");
	db = res								
});

//Whenever we make a new user, we should get a fresh instance of database for them.
/* getVehicles, getLaunches, getLaunchpads are helper functions for newUser. Uses promises to make sure we are able to get all of the data
   before inserting! */
var baseURL = 'https://api.spacexdata.com/v1/'
var vehicles
var launches
var launchpads

function getVehicles() {
		return new Promise((resolve, reject) => {
		 let query = baseURL + 'vehicles'

		request.get(query, function(error, response, body) {
			console.log(query)
			if (error) {
				return error;
			}

			if (response.statusCode === 200) {
				let fullData = JSON.parse(body);
				if (fullData) {
					//console.log("Spaceships: ", fullData)
				}
				resolve(fullData);
			}

		});
	})
}

function getLaunches() {
		return new Promise((resolve, reject) => {
		 let query = baseURL + 'launches'

		request.get(query, function(error, response, body) {
			console.log(query)
			if (error) {
				return error;
			}

			if (response.statusCode === 200) {
				let fullData = JSON.parse(body);
				if (fullData) {
					//console.log("Spaceships: ", fullData)
				}
				resolve(fullData);
			}

		});
	})
}
	
function getLaunchpads() {
		return new Promise((resolve, reject) => {
		 let query = baseURL + 'launchpads'

		request.get(query, function(error, response, body) {
			console.log(query)
			if (error) {
				return error;
			}

			if (response.statusCode === 200) {
				let fullData = JSON.parse(body);
				if (fullData) {
					//console.log("Spaceships: ", fullData)
				}
				resolve(fullData);
			}

		});
	})
}

/* Gets a fresh copy from the spacex api for a new user's copy.
   Thoughts: If a user makes a new account, we call this function to make their row? */
function newUser(userName, passWord) {
	//Get vehicles, followed by launches, followed by launchpads, and finally we insert into the collection.
	getVehicles()
	.then(allVehicles => {
	  vehicles = JSON.stringify(allVehicles)
	  return getLaunches()
	})
	.then(allLaunches => {
	  launches = JSON.stringify(allLaunches)
	  return getLaunchpads()
	})
	.then(allLaunchpads => {
	  launchpads = JSON.stringify(allLaunchpads)
	  //Done getting our data!
	})
	.then(fourthId => {
		//Use JSON.parse when we want to get the JSON object again
		var data = {user: userName, password: passWord, vehicles: vehicles, launches: launches, launchpads: launchpads}
		//TODO: Change this to whatever our proper collection is.
		db.collection("TeamUndefinedSol").insertOne(data, function(err, res){
			if (err) {
				console.log(err);
			} else { 
				//console.log(res);
			}
		});
		//In projection, don't mix user: true and text: false -> Use only one! It will display everything else
		db.collection("TeamUndefinedSol").find({}, {_id: false, vehicles: false, launches: false, launchpads: false}).toArray(function (err, res) {
			if (err) { 
			console.log(err);
			} else {
				console.log("Find:");
				console.log(res);
			}
		});
		//db.close();
	})
	.catch(err => {
	  console.log("Error!",err)
	})
	
}

//newUser("JOHN", "19h323")

app.use(logger)
app.use(morgan('common'))

//restful api?
//Comment out if testing until we implement! Or else we crash!
app.get();

app.post();

app.put();

app.delete();

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

