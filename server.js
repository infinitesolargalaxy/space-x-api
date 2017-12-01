// ========== Constants ==========
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const basicAuth = require('basic-auth');
const request = require('request');
const MongoClient = require('mongodb').MongoClient

const app = express();
const PORT = process.env.PORT || 3000;
const baseURL = 'https://api.spacexdata.com/v2/';  // Space-X API
const dbURL = "mongodb://csc309f:csc309fall@ds117316.mlab.com:17316/csc309db";  // MongoDB Database
const COLLECTION_NAME = 'teamundefined';
var db;  // Database
var collection;  // Collection in database

// ========== Configure app ==========
app.set('view engine', 'ejs');     // res.render('foo') -> /views/foo.ejs
app.use(express.static('public'))  // /foo -> /public/foo
app.use(bodyParser.json());        // -d '{"foo": "value"}' -> req.body.foo
app.use(cookieParser());           // -H "Cookie: foo=value" -> req.cookies.foo

app.use((req, res, next) => {      // Authenticator. Adds req.user field if successfully logged in.
  var auth = basicAuth(req);
  if (auth) {  // Logging in through console
    checkAuth(auth.name, auth.pass).then(isAuthorized => {
      if (isAuthorized) {  // Authorized
        req.user = auth.name;
        next();
      } else {  // Unauthorized
        res.sendStatus(401);
      }
    }).catch(err => {
      next(err);
    });
  } else if (req.cookies.user) {  // Already logged in through browser
    req.user = req.cookies.user;
    next();
  } else {  // Not logged in
    next();
  }
});

// Checks username and password credentials against database
function checkAuth(username, password) {
  console.log("Login attempt", username, password);
  if (!username || !password) {
    return Promise.resolve(false);
  }
  return collection.find({user: username, password: password}).limit(1).hasNext();
}

app.use((req, res, next) => {      // Logger
  if (req.user) {
    console.log(req.user + ":", req.method, req.url, req.body);
  } else {
    console.log(req.method, req.url, req.body);
  }
  next();
});

// ========== Browser routes ==========
// Homepage
app.get('/', (req, res) => {
  res.render('index', {isLoggedIn: req.user});
});

// Login page and request
app.route('/login')
  .get((req, res) => {
    // TODO: Move this to POST and have a proper login form for GET
    var username = 'john';  // Hard code login to john
    var password = 'a';
    checkAuth(username, password).then(isAuthorized => {
      if (isAuthorized) {  // Authorized
        res.cookie('user', username);
        res.redirect('/');
		//TODO: Remove this print
		db.collection("teamundefined").find({}, {_id: false, launches: false, launchpads: false}).toArray(function (err, res) {
			if (err) { 
			console.log(err);
			} else {
				console.log("Find:");
				console.log(res);
			}
		});
      } else {  // Unauthorized
        res.sendStatus(401);
      }
    }).catch(err => {
      // TODO
    });
  });

// Logout request
app.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.redirect('/');
});

// Vehicles collection
app.route('/vehicles')
  .get((req, res) => {
    getVehicles(req.user).then(data => {
      res.render('vehicles/index', {
        title: "Vehicles",
        data: data,
        isLoggedIn: req.user
      });
    }).catch(err => {
      // TODO
    })
  });

// A vehicle
app.route('/vehicles/:id')
  .get((req, res) => {
    getVehicles(req.user, req.params.id).then(data => {
      res.render('vehicles/index', {
        title: "Vehicle " + req.params.id,
        data: [data],
        isLoggedIn: req.user
      });
    }).catch(err => {
      // TODO
    })
  });

// Launches collection. /launches, /launches?vehicle=<id>, /launches?launchpad=<id>
app.route('/launches')
  .get((req, res) => {
    getLaunches(req.user, null, req.query.vehicle, req.query.launchpad).then(data => {
      res.render('launches/index', {
        title: "Launches",
        data: data,
        isLoggedIn: req.user
      });
    }).catch(err => {
      // TODO
    })
  });

// A launch
app.route('/launches/:id')
  .get((req, res) => {
    getLaunches(req.user, req.params.id).then(data => {
      res.render('launches/index', {
        title: "Launch #" + req.params.id,
        data: [data],
        isLoggedIn: req.user
      });
    }).catch(err => {
      // TODO
    })
  });

// Launchpads collection
app.route('/launchpads')
  .get((req, res) => {
    getLaunchpads(req.user).then(data => {
      res.render('launchpads/index', {
        title: "Launchpads",
        data: data,
        isLoggedIn: req.user
      });
    }).catch(err => {
      // TODO
    })
  });

// A launchpad
app.route('/launchpads/:id')
  .get((req, res) => {
    getLaunchpads(req.user, req.params.id).then(data => {
      res.render('launchpads/index', {
        title: "Launchpad " + req.params.id,
        data: [data],
        isLoggedIn: req.user
      });
    }).catch(err => {
      // TODO
    })
  });

// ========== API routes ==========
app.get('/api', (req, res) => {
  res.send({
    links: {
      vehicles: '/api/vehicles',
      launches: '/api/launches',
      launchpads: '/api/launchpads'
    }
  });
});

app.route('/api/vehicles')
  .get((req, res) => {
    getVehicles(req.user).then(data => {
      res.send({
        data: data,
        links: {
          vehicle: '/api/vehicles/<id>'
        }
      });
    }).catch(err => {
      // TODO
    })
  });

app.route('/api/vehicles/:id')
  .get((req, res) => {
    getVehicles(req.user, req.params.id).then(data => {
      res.send({
        data: data,
        links: {
          vehicles: '/api/vehicles',
          vehicle_launches: '/api/launches?vehicle=' + data.id
        }
      });
    }).catch(err => {
      // TODO
    })
  });

app.route('/api/launches')
  .get((req, res) => {
    getLaunches(req.user, null, req.query.vehicle, req.query.launchpad).then(data => {
      res.send({
        data: data,
        links: {
          launch: '/api/launches/flight_number',
          vehicle_launches: '/api/launches?vehicle=<id>',
          launchpad_launches: '/api/launches?launchpad=<id>'
        }
      });
    }).catch(err => {
      // TODO
    })
  });

app.route('/api/launches/:id')
  .get((req, res) => {
    getLaunches(req.user, req.params.id).then(data => {
      res.send({
        data: data,
        links: {
          launches: '/api/launches',
          launch_vehicle: '/api/vehicle/' + data.rocket.rocket_id,
          launch_launchpad: '/api/launchpads/' + data.launch_site.site_id
        }
      });
    }).catch(err => {
      // TODO
    })
  });

app.route('/api/launchpads')
  .get((req, res) => {
    getLaunchpads(req.user).then(data => {
      res.send({
        data: data,
        links: {
          launchpad: '/api/launchpads/<id>'
        }
      });
    }).catch(err => {
      // TODO
    })
  });

app.route('/api/launchpads/:id')
  .get((req, res) => {
    getLaunchpads(req.user, req.params.id).then(data => {
      res.send({
        data: data,
        links: {
          launchpads: '/api/launchpads',
          launchpad_launches: '/api/launches?launchpad=' + data.id
        }
      });
    }).catch(err => {
      // TODO
    })
  });
  
//Deleting things requires individual id!
app.delete('/api', (req, res) => {
  res.send({
    links: {
      vehicles: '/api/vehicles',
      launches: '/api/launches',
      launchpads: '/api/launchpads'
    }
  });
});

app.route('/api/vehicles/:id')
  .delete((req, res) => {
    deleteVehicle(req.user, req.params.id).then(data => {
      res.send({
        data: data,
        links: {
          vehicles: '/api/vehicles',
          vehicle_launches: '/api/launches?vehicle=' + data.id
        }
      });
    }).catch(err => {
      // TODO
    })
  });
  
app.route('/api/launches/:id')
  .delete((req, res) => {
    deleteLaunch(req.user, req.params.id).then(data => {
      res.send({
        data: data,
        links: {
          vehicles: '/api/launch',
          vehicle_launches: '/api/launches?vehicle=' + data.id
        }
      });
    }).catch(err => {
      // TODO
    })
  });
  
 app.route('/api/launchpads/:id')
  .delete((req, res) => {
    deleteLaunchpad(req.user, req.params.id).then(data => {
      res.send({
        data: data,
        links: {
          vehicles: '/api/launch',
          vehicle_launches: '/api/launches?vehicle=' + data.id
        }
      });
    }).catch(err => {
      // TODO
    })
  });
// ========== Helper function for use in ejs files to format output ==========
app.locals.printProperty = function(elem, key, keyName, pre, suf) {
  if (elem.hasOwnProperty(key)) {
      return keyName + ': ' + pre + elem[key] + suf;
  } else {
    return keyName + ': N/A';
  }
};

// ========== Connect to database and Start server ==========
MongoClient.connect(dbURL, (err, res) => {
  if (err) {
    console.log(err);
  } else {
    db = res;
    collection = db.collection(COLLECTION_NAME);
    console.log("Connected to database using collection " + COLLECTION_NAME);

    // TODO: Remove this
    collection.drop();
    addUser('john', 'a').then(res => {  // Hard code user john
      console.log("(added user 'john' with password 'a')");
    })
    .catch(err => {
      // TODO
    });

    app.listen(PORT, () => {
      console.log("Server listening on port " + PORT);
    });
  }
});

// ====================================================================================================

// ========== Get data from Space-X API or database ==========
function addUser(user, password) {
  return collection.find({user: user}).limit(1).hasNext().then(res => {
    if (res) {
      throw new Error("User already exists");
    }
    return getVehicles().then(vehicles => {
      return getLaunches().then(launches => {
        return getLaunchpads().then(launchpads => {
          return collection.insertOne({
            user: user,
            password: password,
            vehicles: JSON.stringify(vehicles),
            launches: JSON.stringify(launches),
            launchpads: JSON.stringify(launchpads)
          }).then(res => {
            return res.insertedCount;
          });
        });
      });
    });
  });
}

function getVehicles(user, id) {
  if (user) {  // Logged in
    // Use database
    return collection.find({user: user}).limit(1).next().then(res => {
      if (id) {
        return JSON.parse(res.vehicles).find(elem => elem.id == id);
      } else {
        return JSON.parse(res.vehicles);
      }
    });
  } else {  // Not logged in
    // Use Space-X API
    var url = baseURL + 'vehicles';
    if (id) {
      url += '/' + id;  // Single vehicle
    }
    return new Promise((resolve, reject) => {
      request.get(url, function(err, res, body) {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }
}

function getLaunches(user, id, vehicle_id, launchpad_id) {
  if (user) {  // Logged in
    // Use database
    return collection.find({user: user}).limit(1).next().then(res => {
      if (id) {
        return JSON.parse(res.launches).find(elem => elem.flight_number == id);
      } else if (vehicle_id) {
        return JSON.parse(res.launches).filter(elem => elem.rocket.rocket_id == vehicle_id);
      } else if (launchpad_id) {
        return JSON.parse(res.launches).filter(elem => elem.launch_site.site_id == launchpad_id);
      } else {
        return JSON.parse(res.launches);
      }
    });
  } else {  // Not logged in
    // Use Space-X API
    var url = baseURL + 'launches';
    if (id) {
      url += '?flight_number=' + id;  // Single launch
    } else if (vehicle_id) {
      url += '?rocket_id=' + vehicle_id;  // Filter by vehicle
    } else if (launchpad_id) {
      url += '?site_id=' + launchpad_id;  // Filter by launchpad
    }
    return new Promise((resolve, reject) => {
      request.get(url, function(err, res, body) {
        if (err) {
          reject(err);
        } else {
          if (id) {
            resolve(JSON.parse(body).find(elem => elem.flight_number == id));
          } else {
            resolve(JSON.parse(body));
          }
        }
      });
    });
  }
}

function getLaunchpads(user, id) {
  if (user) {  // Logged in
    // Use database
    return collection.find({user: user}).limit(1).next().then(res => {
      if (id) {
        return JSON.parse(res.launchpads).find(elem => elem.id == id);
      } else {
        return JSON.parse(res.launchpads);
      }
    });
  } else {  // Not logged in
    // Use Space-X API
    var url = baseURL + 'launchpads';
    if (id) {
      url += '/' + id;  // Single launchpad
    }
    return new Promise((resolve, reject) => {
      request.get(url, function(err, res, body) {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }
}

//If user is already logged in, 
function addVehicle(user, id, name, active, cost_per_launch, success_rate_pct, first_flight, description) {
  if (user) {  // Logged in
    // Use database
    getVehicles(user, id).then(data => {
      if (data) { //Already exists!
		  throw new Error("Vehicle with id already exists, use a put request for updating.");
	  } else {
		var newdata = JSON.stringify(data.push({id: id, name: name, active: active, cost_per_launch: cost_per_launch, success_rate_pct: success_rate_pct, first_flight: first_flight, description})); //Since getVehicles returns a JSON object array, just append
		//Make in JSON
		collection.update({user: user}, {$set: {vehicles: newdata}}).then(res => {
			console.log(res);
		});
		
	  }
    }).catch(err => {
      // TODO
    })
  } else {  // Not logged in
      throw new Error("Please log in to perform that action.");
  }
}

//Takes in the JSON array, id to look for, and the attribute to check with.
function deleteHelper(data, id, attr) {
	var found = 0 //Flag variable
		data.forEach(function (value, i) {
		console.log('Index %d %s', i, JSON.stringify(data[i]));
		if(data[i][attr] == id){
			//If we simply delete, we will have a null in the deleted entry's index. Thus, we must use splice to correct the array afterwards
			delete data[i] //Seems to do the same thing even if we didn't delete first.
			data.splice(i ,1);
			found = 1
		}
	});
	console.log(found);
	return found;
}
function deleteVehicle(user, id) {
  if (user) {  // Logged in
    return getVehicles(user).then(data => {
      if (data) { //Can try to delete something
		var found = deleteHelper(data, id, 'id');
		console.log(found);
		if (found == 1) { //Before updating, check if we actually found anything
			return collection.updateOne({user: user}, {$set: {vehicles: JSON.stringify(data)}}).then(res => {
				//console.log(data);
				return JSON.stringify(data);
		    });
		} else {
			//TODO: Error handling
		}
	  } else {
		console.log("No vehicle with that id found");
		//TODO: Error handling
	  }
    });
  } else {  // Not logged in
    console.log("Please log in to perform that action.");
	//TODO: Error handling
  } 
}

function deleteLaunch(user, id) {
  if (user) {  // Logged in
    return getLaunches(user).then(data => {
      if (data) { //Can try to delete something
		var found = deleteHelper(data, id, 'flight_number');
		console.log(found);
		if (found == 1) { //Before updating, check if we actually found anything
			return collection.updateOne({user: user}, {$set: {launches: JSON.stringify(data)}}).then(res => {
				//console.log(data);
				return JSON.stringify(data);
		    });
		} else {
			//TODO: Error handling
		}
	  } else {
		console.log("No vehicle with that id found");
		//TODO: Error handling
	  }
    });
  } else {  // Not logged in
    console.log("Please log in to perform that action.");
	//TODO: Error handling
  } 
}

function deleteLaunchpad(user, id) {
  if (user) {  // Logged in
    return getLaunchpads(user).then(data => {
      if (data) { //Can try to delete something
		var found = deleteHelper(data, id, 'id');
		console.log(found);
		if (found == 1) { //Before updating, check if we actually found anything
			return collection.updateOne({user: user}, {$set: {launchpads: JSON.stringify(data)}}).then(res => {
				//console.log(data);
				return JSON.stringify(data);
		    });
		} else {
			//TODO: Error handling
		}
	  } else {
		console.log("No vehicle with that id found");
		//TODO: Error handling
	  }
    });
  } else {  // Not logged in
    console.log("Please log in to perform that action.");
	//TODO: Error handling
  } 
}

