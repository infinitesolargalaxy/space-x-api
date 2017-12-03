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
  })
  .post((req,res) =>{
	if (req.user) {
		addVehicle(req.user, req.body).then (data => {
		  res.render('vehicles/index', {
			title: "Vehicle " + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  //TODO
		})
	} else {
		res.sendStatus(401);
	}
  });

// A vehicle
app.route('/vehicles/:id')
  .get((req, res) => {
    getVehicles(req.user, req.params.id).then(data => {
      if (data) {
        res.render('vehicles/index', {
          title: "Vehicle " + req.params.id,
          data: [data],
          isLoggedIn: req.user
        });
      } else {
        res.sendStatus(404);
      }
    }).catch(err => {
      res.sendStatus(500);
    })
  })
  .put((req, res) => {
	if (req.user) {
		updateVehicle(req.user, req.params.id, req.body).then(data => {
		  res.render('vehicles/index', {
			title: "Vehicle " + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  })
  .delete((req, res) => {
	if (req.user) {
		deleteVehicle(req.user, req.params.id).then(data => {
		  res.render('vehicles/index', {
				title: "Vehicle " + req.params.id,
				data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
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
  })
  .post((req, res) => {
	if (req.user) {
		addLaunch(req.user, req.body).then(data => {
		  res.render('launches/index', {
			title: "Launch #" + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  });

// A launch
app.route('/launches/:id')
  .get((req, res) => {
    getLaunches(req.user, req.params.id).then(data => {
      if (data) {
        res.render('launches/index', {
          title: "Launch #" + req.params.id,
          data: [data],
          isLoggedIn: req.user
        });
      } else {
        res.sendStatus(404);
      }
    }).catch(err => {
      res.sendStatus(500);
    })
  })
  .put((req, res) => {
	if (req.user) {
		updateLaunch(req.user, req.params.id, req.body).then(data => {
		  res.render('launches/index', {
			title: "Launch #" + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  })
  .delete((req, res) => {
	if (req.user) {
		deleteLaunch(req.user, req.params.id).then(data => {
		  res.render('launches/index', {
			title: "Launch #" + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
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
  })
  .post((req, res) => {
	if (req.user) {
		addLaunchpad(req.user, req.body).then(data => {
		  res.render('launchpads/index', {
			title: "Launchpad " + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  });

// A launchpad
app.route('/launchpads/:id')
  .get((req, res) => {
    getLaunchpads(req.user, req.params.id).then(data => {
      if (data) {
        res.render('launchpads/index', {
          title: "Launchpad " + req.params.id,
          data: [data],
          isLoggedIn: req.user
        });
      } else {
        res.sendStatus(404);
      }
    }).catch(err => {
      res.sendStatus(500);
    })
  })
  .put((req, res) => {
	if (req.user) {
		updateLaunchpad(req.user, req.params.id, req.body).then(data => {
		  res.render('launchpads/index', {
			title: "Launchpad " + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  })
  .delete((req, res) => {
	if (req.user) {
		deleteLaunchpad(req.user, req.params.id).then(data => {
		  res.render('launchpads/index', {
			title: "Launchpad " + req.params.id,
			data: [data],
			isLoggedIn: req.user
		  });
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
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
})
.put('/api', (req, res) => {
  res.send({
    links: {
      vehicles: '/api/vehicles',
      launches: '/api/launches',
      launchpads: '/api/launchpads'
    }
  });
})
.delete('/api', (req, res) => {
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
  })
  .post((req, res) => {
	if (req.user) {
		addVehicle(req.user, req.body).then(data => {
		  res.send(data);
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  });

app.route('/api/vehicles/:id')
  .get((req, res) => {
    getVehicles(req.user, req.params.id).then(data => {
      if (data) {
        res.send({
          data: data,
          links: {
            vehicles: '/api/vehicles',
            vehicle_launches: '/api/launches?vehicle=' + data.id
          }
        });
      } else {
        res.sendStatus(404);
      }
    }).catch(err => {
      res.sendStatus(500);
    })
  })
  .put((req, res) => {
	if (req.user) {
		updateVehicle(req.user, req.params.id, req.body).then(data => {
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
	} else {
		res.sendStatus(401);
	}
  })
  .delete((req, res) => {
	if (req.user) {
		deleteVehicle(req.user, req.params.id).then(data => {
		  res.sendStatus(200);
		  /*res.send({
			data: data,
			links: {
			  vehicles: '/api/vehicles',
			  vehicle_launches: '/api/launches?vehicle=' + data.id
			}
		  });*/
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
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
  })
  .post((req, res) => {
	if (req.user) {
		addLaunch(req.user, req.body).then(data => {
		  res.send(data);
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  });

app.route('/api/launches/:id')
  .get((req, res) => {
    getLaunches(req.user, req.params.id).then(data => {
      if (data) {
        res.send({
          data: data,
          links: {
            launches: '/api/launches',
            launch_vehicle: '/api/vehicle/' + data.rocket.rocket_id,
            launch_launchpad: '/api/launchpads/' + data.launch_site.site_id
          }
        });
      } else {
        res.sendStatus(404);
      }
    }).catch(err => {
      res.sendStatus(500);
    })
  })
  .put((req, res) => {
	if (req.user) {
		updateLaunch(req.user, req.params.id, req.body).then(data => {
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
	} else {
		res.sendStatus(401);
	}
  })
  .delete((req, res) => {
	if (req.user) {
		deleteLaunch(req.user, req.params.id).then(data => {
		  res.sendStatus(200);
		  /*res.send({
			data: data,
			links: {
			  vehicles: '/api/launch',
			  vehicle_launches: '/api/launches?vehicle=' + data.id
			}
		  });*/
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
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
  })
  .post((req, res) => {
	if (req.user) {
		addLaunchpad(req.user, req.body).then(data => {
		  res.send(data);
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
  });

app.route('/api/launchpads/:id')
  .get((req, res) => {
    getLaunchpads(req.user, req.params.id).then(data => {
      if (data) {
        res.send({
          data: data,
          links: {
            launchpads: '/api/launchpads',
            launchpad_launches: '/api/launches?launchpad=' + data.id
          }
        });
      } else {
        res.sendStatus(404);
      }
    }).catch(err => {
      res.sendStatus(500);
    })
  })
  .put((req, res) => {
	if (req.user) {
		updateLaunchpad(req.user, req.params.id, req.body).then(data => {
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
	} else {
		res.sendStatus(401);
	}
  })
  .delete((req, res) => {
	if (req.user) {
		deleteLaunchpad(req.user, req.params.id).then(data => {
		  res.sendStatus(200);
		  /*res.send({
			data: data,
			links: {
			  vehicles: '/api/launch',
			  vehicle_launches: '/api/launches?vehicle=' + data.id
			}
		  });*/
		}).catch(err => {
		  // TODO
		})
	} else {
		res.sendStatus(401);
	}
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
// ========== Helper function to add a new user ==========
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

// ========== Get data from Space-X API or database ==========
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
          if (res.statusCode == 200) {
            resolve(JSON.parse(body));
          } else {
            resolve(undefined);
          }
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
          if (res.statusCode == 200) {
            resolve(JSON.parse(body));
          } else {
            resolve(undefined);
          }
        }
      });
    });
  }
}

/*
Curl tests
DELETE
curl -u john:a --request DELETE localhost:3000/api/vehicles/falcon1
curl -u john:a --request DELETE localhost:3000/api/launches/2
curl -u john:a --request DELETE localhost:3000/api/launchpads/ccafs_slc_40

PUT
curl -u john:a -d '{"active": "true", "cost_per_launch" : "1"}' -H "Content-Type: application/json" --request PUT localhost:3000/api/vehicles/falcon9
curl -u john:a -d '{"launch_success": "true"}' -H "Content-Type: application/json" --request PUT localhost:3000/api/launches/1
curl -u john:a -d '{"full_name": "Deep Space Nine"}' -H "Content-Type: application/json" --request PUT localhost:3000/api/launchpads/ksc_lc_39a

POST
curl -u john:a -d '{"id": "falcon10", "name": "Falcon 10", "cost_per_launch": "100000000000", "success_rate_pct": "100", "first_flight": "2006-03-24",  "active": "true", "description":"The Falcon 10 is next gen"}' -H "Content-Type: application/json" --request POST localhost:3000/api/vehicles/
curl -u john:a -d '{"id":"deathstar","full_name":"Peace Moon","status":"active","location":{"name":"Cape Canaveral","region":"Florida"},"vehicles_launched":"falcon 9","details":"Fully operation battlestation"}' -H "Content-Type: application/json" --request POST localhost:3000/api/launchpads/
curl -u john:a -d '{"flight_number":100,"launch_date_local":"2006-03-25T10:30:00+12:00","rocket":{"rocket_id":"falcon1","rocket_name":"Falcon 1"},"launch_site":{"site_id":"kwajalein_atoll","site_name":"Kwajalein Atoll","site_name_long":"Kwajalein Atoll Omelek Island"},"launch_success":false,"details":"Engine failure at 33 seconds and loss of vehicle"}' -H "Content-Type: application/json" --request POST localhost:3000/api/launches/
*/

//Enforces that the data does not already exist.
function doesNotExist(data, id, attr) {
	for (var i = 0; i < data.length; i++) {
		console.log('Index %d', i, data[i][attr], id);
		//Find JSON object with same id as what we're looking for
		if(data[i][attr] === id){
			console.log("Object with id %s already exists!", id.toString())
			return 0; //Fail
		}
	}
	return 1; //Nothing already exists, we can move on.
}

//Enforces that newdata has id, name, cost_per_launch, success_rate_pct, first_flight, active and description
//We don't care if they have extra attributes as long as we satisfy these ones
//Returns the id/key for this object as defined by attr on success and null on failure
function addVehicleHelper(newdata, attr) {
	var dictionary = {"id": false, "name": false, "cost_per_launch": false, "success_rate_pct": false, "first_flight": false, "active":false, "description":false};
	for (var key in newdata) {
		//Filter out hidden attributes of an object
		if (newdata.hasOwnProperty(key)) {
			console.log(newdata[key])
			//Check if this is one of the ones we're looking for.
			if (dictionary.hasOwnProperty(key)) {
				dictionary[key] = true;
			}
		}
	}
	//Check if all conditions were satisfied
	for (var key in dictionary) {
		//Filter out hidden attributes of an object
		if (dictionary.hasOwnProperty(key)) {
			console.log(dictionary[key])
			if (!dictionary[key]) {
				return null; //Fails
			}
		}
	}
	return newdata[attr]; //Success
}

function addVehicle(user, newdata) {
  if (newdata) {
    return getVehicles(user).then(data => {
    if (data) { //Update stuff
	  var id = addVehicleHelper(newdata, 'id'); //We normally don't have id for post since we target a collection
	  //First check if we returned null or not. If not, we can continue with checking for existence
      if (id && doesNotExist(data, id, 'id') == 1) {
			//TODO: Add something that checks that newdata is in valid format!
		  data.push(newdata)
		  return collection.updateOne({user: user}, {$set: {vehicles: JSON.stringify(data)}}).then(res => {
			console.log(JSON.stringify(data));
			return newdata;
		  });  
	  } else {
		console.log("Invalid data");
		//TODO: Error handling
	  }
    } else {
      console.log("No vehicle with that id found");
      //TODO: Error handling
    }
    });
  } else { //Not using -d '{"data": "stuff"}'
    
  }
}

function addLaunch(user, newdata){
  console.log (newdata);
  if (newdata) {
    return getLaunches(user).then(data => {
      if (data) { //Update stuff
      
      //TODO: Add something that checks that newdata is in valid format!
      data.push(newdata)
      return collection.updateOne({user: user}, {$set: {launches: JSON.stringify(data)}}).then(res => {
        console.log(JSON.stringify(data));
        return JSON.stringify(newdata);
      });
      } else {
      console.log("No launch with that id found");
      //TODO: Error handling
      }
    });
  } else { //Not using -d '{"data": "stuff"}'
    
  }
}

function addLaunchpad(user, newdata){
  console.log (newdata);
  if (newdata) {
    return getLaunchpads(user).then(data => {
      if (data) { //Update stuff
      console.log("updating!");
      //TODO: Add something that checks that newdata is in valid format!
      data.push(newdata)
      return collection.updateOne({user: user}, {$set: {launchpads: JSON.stringify(data)}}).then(res => {
        console.log(JSON.stringify(data));
        return JSON.stringify(newdata);
      });
      } else {
      console.log("No launchpad with that id found");
      //TODO: Error handling
      }
    });
  } else { //Not using -d '{"data": "stuff"}'
    
  }
}

//Returns the updated object with the id if updated else returns null
//Mutate data inside helper before updating our collection
function updateHelper(data, id, attr, newdata) {
	//Tracks if we had any errors inside while trying to update key
	var err = 0
	var success = 0
	for (var i = 0; i < data.length; i++) {
		console.log('Index %d', i);
		//Find JSON object with same id as what we're looking for
		if(data[i][attr] == id){
			console.log("Found our attribute!")
			//For each attribute in -d '{"attr1": "foo"}', update our data with it.
			for (var key in newdata) {
				//Filter out hidden attributes of an object
				if (newdata.hasOwnProperty(key)) {
					console.log("Checking if data has key!")
					//Make sure we aren't trying to update the superkey of the data
					if (key == attr) {
						err++;
						break;
					//Make sure that our original data already has this data as well, otherwise we are trying to update a non-existing field!
					} else if (data[i].hasOwnProperty(key)) { 
						console.log(key + " -> " + newdata[key]);
						console.log(key + " -> " + data[i][key]);
						//Update the data!
						data[i][key] = newdata[key]
						success++;
					} else {
						//Can't update a non existing attribute!
						err++;
						break;
					}
				}
			}
			const message = "Success: " + success + " err: " + err;
			// Print the string
			console.log(message)
			if (err == 0 && success > 0) { //Success! Return data that was updated
				return data[i];
			} else { //Error!
				return null;
			}
		}
	}
	//Didn't find anything
	return null;
}

function updateVehicle(user, id, newdata) {
   console.log(user, id, newdata);
    if (newdata) {
		return getVehicles(user).then(data => {
		  if (data) { //Update stuff
				var result = updateHelper(data, id, 'id', newdata);
				if (result) { //Means we got back data!
					return collection.updateOne({user: user}, {$set: {vehicles: JSON.stringify(data)}}).then(res => {
						//console.log(data);
						return result;
					});
				} else {
					//Error handling
				}
		  } else {
			console.log("No vehicle with that id found");
			//TODO: Error handling
		  }
		});
	} else { //Not using -d '{"data": "stuff"}'
		
	}
}

function updateLaunch(user, id, newdata) {
   console.log(newdata);
    if (newdata) {
		return getLaunches(user).then(data => {
		  if (data) { //Update stuff
				var result = updateHelper(data, id, 'flight_number', newdata);
				if (result) { //Means we got back data!
					return collection.updateOne({user: user}, {$set: {launches: JSON.stringify(data)}}).then(res => {
						//console.log(data);
						return result;
					});
				} else {
					//Error handling
				}
		  } else {
			console.log("No launch with that id found");
			//TODO: Error handling
		  }
		});
	} else { //Not using -d '{"data": "stuff"}'
		//TODO: Error handling
	}
}

function updateLaunchpad(user, id, newdata) {
   console.log(newdata);
    if (newdata) {
		return getLaunchpads(user).then(data => {
		  if (data) { //Update stuff
				var result = updateHelper(data, id, 'id', newdata);
				if (result) { //Means we got back data!
					return collection.updateOne({user: user}, {$set: {launchpads: JSON.stringify(data)}}).then(res => {
						//console.log(data);
						return result;
					});
				} else {
					//Error handling
				}
		  } else {
			console.log("No launch with that id found");
			//TODO: Error handling
		  }
		});
	} else { //Not using -d '{"data": "stuff"}'
		//TODO: Error handling
	}
}

//Returns a copy of the data on success
//Takes in the JSON array, id to look for, and the attribute to check with.
function deleteHelper(data, id, attr) {
	//Just check for every index
	for (var i = 0; i < data.length; i++) {
		console.log('Index %d %s', i, JSON.stringify(data[i]));
		//Look if the id is the same as our's
		if(data[i][attr] == id){
			//Make a copy!
			var copy = JSON.parse(JSON.stringify(data[i])); //
			//If we simply delete, we will have a null in the deleted entry's index. Thus, we must use splice to correct the array afterwards
			delete data[i] //Seems to do the same thing even if we didn't delete first.
			data.splice(i ,1);
			return copy;
		}
	}
	return null
}

function deleteVehicle(user, id) {
    return getVehicles(user).then(data => {
      if (data) { //Can try to delete something
		var found = deleteHelper(data, id, 'id');
		console.log(found);
		if (found) { //Before updating, check if we actually found anything
			return collection.updateOne({user: user}, {$set: {vehicles: JSON.stringify(data)}}).then(res => {
				//console.log(data);
				return found;
		    });
		} else {
			//TODO: Error handling
		}
	  } else {
		console.log("No vehicle with that id found");
		//TODO: Error handling
	  }
    });
}

function deleteLaunch(user, id) {
    return getLaunches(user).then(data => {
      if (data) { //Can try to delete something
		var found = deleteHelper(data, id, 'flight_number');
		console.log(found);
		if (found) { //Before updating, check if we actually found anything
			return collection.updateOne({user: user}, {$set: {launches: JSON.stringify(data)}}).then(res => {
				console.log(found);
				return found;
		    });
		} else {
			//TODO: Error handling
		}
	  } else {
		console.log("No vehicle with that id found");
		//TODO: Error handling
	  }
    });
}

function deleteLaunchpad(user, id) {
    return getLaunchpads(user).then(data => {
      if (data) { //Can try to delete something
		var found = deleteHelper(data, id, 'id');
		console.log(found);
		if (found) { //Before updating, check if we actually found anything
			return collection.updateOne({user: user}, {$set: {launchpads: JSON.stringify(data)}}).then(res => {
				//console.log(data);
				return found;
		    });
		} else {
			//TODO: Error handling
		}
	  } else {
		console.log("No vehicle with that id found");
		//TODO: Error handling
	  }
    });
}

