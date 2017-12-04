// ========== Constants ==========
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const basicAuth = require('basic-auth');
const methodOverride = require("method-override");
const request = require('request');
const MongoClient = require('mongodb').MongoClient

const app = express();
const PORT = process.env.PORT || 3000;
const baseURL = 'https://api.spacexdata.com/v2/';  // Space-X API
const dbURL = "mongodb://csc309f:csc309fall@ds117316.mlab.com:17316/csc309db";  // MongoDB Database
const COLLECTION_NAME = 'teamundefined';
var db;  // Database
var collection;  // Collection in database

const OK = 200;  // HTTP status codes
const INVALID_FORMAT = 400;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;
const ERROR = 500;

// ========== Configure app ==========
app.set('view engine', 'ejs');     // res.render('foo') -> /views/foo.ejs
app.use(express.static('public'))  // /foo -> /public/foo
app.use(bodyParser.json());        // -d '{"foo": "value"}' -> req.body.foo
app.use(bodyParser.urlencoded({ extended: true }));  // -d 'foo=value' -> req.body.foo
app.use(methodOverride("_method"));  // ?_method=PUT -> PUT and ?_method=DELETE -> DELETE
app.use(cookieParser());           // -H "Cookie: foo=value" -> req.cookies.foo

app.use((req, res, next) => {      // Authenticator. Adds req.user field if successfully logged in.
  var auth = basicAuth(req);
  if (auth) {  // Logging in through console
    checkAuth(auth.name, auth.pass).then(isAuthorized => {
      if (isAuthorized) {  // Authorized
        req.user = auth.name;
        next();
      } else {  // Unauthorized
        res.sendStatus(UNAUTHORIZED);
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

// Helper function that checks username and password credentials against database
function checkAuth(username, password) {
  console.log("(login attempt user '" + username + "' with password '" + password + "')");
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

// Helper function for use in ejs files to format output
app.locals.printProperty = function(elem, key, pre, suf) {
  if (elem == null) {
    return pre + 'N/A' + suf;
  } else if (elem.hasOwnProperty(key) && elem[key] != '') {
      return pre + elem[key] + suf;
  } else {
    return 'N/A' + suf;
  }
};

// ========== Browser routes ==========
// Homepage
app.get('/', (req, res) => {
  res.render('index', {isLoggedIn: req.user});
});

// Login page and request
app.route('/login')
  .get((req, res) => {
    res.render('login', {
      title: "Login/Signup",
      data: null,
      isLoggedIn: req.user
    })
  })
  .post((req, res) => {
    checkAuth(req.body.username, req.body.password).then(isAuthorized => {
      if (isAuthorized) {  // Authorized
        res.cookie('user', req.body.username);
        res.redirect('/');
      } else {  // Unauthorized
        res.send("Incorrect username and password combo");
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    });
  })

// Signup request
app.route('/signup')
 .post((req, res) => {
    addUser(req.body.username, req.body.password).then(isAdded => {
      if (isAdded) {
        res.cookie('user', req.body.username);
        res.redirect('/');
      } else {
        res.send("User " + req.body.username + " already exists");
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    });
  })

// Logout request
app.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.redirect('/');
});

// Browser editing form for vehicle creation
app.get("/vehicles/create", (req, res) => {
  res.render('vehicles/edit', {
    title: "Add a vehicle",
    vehicle: {},
    method: "post",
    isLoggedIn: req.user
  })
});

// Browser editing form for a vehicle
app.get("/vehicles/:id/edit", (req, res) => {
  getVehicles(req.user, req.params.id).then(elem => {
    if (elem) {
      res.render('vehicles/edit', {
        title: "Edit vehicle " + req.params.id,
        vehicle: elem,
        method: "put",
        isLoggedIn: req.user
     })
   } else {
    res.sendStatus(NOT_FOUND);
  }
}).catch(err => {
  console.log(err);
  res.sendStatus(ERROR);
})
});

// Browser editing form for launch creation
app.get("/launches/create", (req, res) => {
  //Make an empty copy
  elem = {flight_number: "", details: "", rocket: "", launch_site: "", launch_date_local: "", launch_success: ""};
  res.render('launches/edit', {
    title: "Add a launch",
    launch: elem,
    method: "post",
    isLoggedIn: req.user
  })
});

//Browser editing form for a launch
app.get("/launches/:id/edit", (req, res) => {
  getLaunches(req.user, Number(req.params.id)).then(elem => {
    if (elem) {
      res.render('launches/edit', {
        title: "Edit launch #" + req.params.id,
        launch: elem,
        method: "put",
        isLoggedIn: req.user
      })
    } else {
      res.sendStatus(NOT_FOUND);
    }
  }).catch(err => {
    console.log(err);
    res.sendStatus(ERROR);
  })
});

//Browser editing form for launchpad creation
app.get("/launchpads/create", (req, res) => {
  //Make an empty copy
  elem = {id: "", full_name: "", details: "", status: "", location: ""};
  res.render('launchpads/edit', {
    title: "Add a launchpad",
    launchpad: elem,
    method: "post",
    isLoggedIn: req.user
  })
});

//Browser editing form for a launchpad
app.get("/launchpads/:id/edit", (req, res) => {
  getLaunchpads(req.user, req.params.id).then(elem => {
    if (elem) {
      res.render('launchpads/edit', {
        title: "Edit launchpad " + req.params.id,
        launchpad: elem,
        method: "put",
        isLoggedIn: req.user
      })
    } else {
      console.log("%s!", req.params.id)
      res.sendStatus(NOT_FOUND);
    }
  }).catch(err => {
    console.log(err);
    res.sendStatus(ERROR);
  })
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
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .post((req,res) =>{
    if (req.user) {
      if (isValid(req.body, vehicleKeys.slice(0, 1))) {
        addVehicle(req.user, req.body).then(elem => {
          res.redirect('/vehicles/' + elem.id);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + vehicleKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// A vehicle
app.route('/vehicles/:id')
  .get((req, res) => {
    getVehicles(req.user, req.params.id).then(elem => {
      if (elem) {
        res.render('vehicles/index', {
          title: "Vehicle " + req.params.id,
          data: [elem],
          isLoggedIn: req.user
        });
      } else {
        res.sendStatus(NOT_FOUND);
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .put((req, res) => {
    if (req.user) {
      if (isValid(req.body, vehicleKeys.slice(0, 1))) {
        updateVehicle(req.user, req.params.id, req.body).then(elem => {
          res.redirect('/vehicles/' + req.params.id);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + vehicleKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  })
  .delete((req, res) => {
    if (req.user) {
      deleteVehicle(req.user, req.params.id).then(elem => {
        if (elem) {
          res.redirect('/vehicles');
        } else {
          res.sendStatus(NOT_FOUND);
        }
      }).catch(err => {
        console.log(err);
        res.sendStatus(ERROR);
      })
    } else {
      res.sendStatus(UNAUTHORIZED);
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
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .post((req, res) => {
    if (req.user) {
	   launchesFormHelper(req.body);
      if (isValid(req.body, launchKeys.slice(0, 4))) {
        addLaunch(req.user, req.body).then(elem => {
          res.redirect('/launches/' + elem.flight_number);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchKeys.slice(0, 4));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// A launch
app.route('/launches/:id')
  .get((req, res) => {
    getLaunches(req.user, Number(req.params.id)).then(elem => {
      if (elem) {
        res.render('launches/index', {
          title: "Launch #" + req.params.id,
          data: [elem],
          isLoggedIn: req.user
        });
      } else {
        res.sendStatus(NOT_FOUND);
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .put((req, res) => {
    if (req.user) {
	   launchesFormHelper(req.body);
      if (isValid(req.body, launchKeys.slice(0, 4))) {
        updateLaunch(req.user, Number(req.params.id), req.body).then(elem => {
          res.redirect('/launches/' + req.params.id);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchKeys.slice(0, 4));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  })
  .delete((req, res) => {
    if (req.user) {
      deleteLaunch(req.user, Number(req.params.id)).then(elem => {
        if (elem) {
          res.redirect('/launches');
        } else {
          res.sendStatus(NOT_FOUND);
        }
      }).catch(err => {
        console.log(err);
        res.sendStatus(ERROR);
      })
    } else {
      res.sendStatus(UNAUTHORIZED);
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
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .post((req, res) => {
    if (req.user) {
	  launchpadsFormHelper(req.body);
      if (isValid(req.body, launchpadKeys.slice(0, 1))) {
        addLaunchpad(req.user, req.body).then(elem => {
          res.redirect('/launchpads/' + elem.id);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchpadKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// A launchpad
app.route('/launchpads/:id')
  .get((req, res) => {
    getLaunchpads(req.user, req.params.id).then(elem => {
      if (elem) {
        res.render('launchpads/index', {
          title: "Launchpad " + req.params.id,
          data: [elem],
          isLoggedIn: req.user
        });
      } else {
        res.sendStatus(NOT_FOUND);
      }
    }).catch(err => {
      res.sendStatus(ERROR);
    })
  })
  .put((req, res) => {
    if (req.user) {
      launchpadsFormHelper(req.body);
      if (isValid(req.body, launchpadKeys.slice(0, 1))) {
        updateLaunchpad(req.user, req.params.id, req.body).then(elem => {
          res.redirect('/launchpads/' + req.params.id)
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchpadKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  })
  .delete((req, res) => {
    if (req.user) {
      deleteLaunchpad(req.user, req.params.id).then(elem => {
        if (elem) {
          res.redirect('/launchpads');
        } else {
          res.sendStatus(NOT_FOUND);
        }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  } else {
    res.sendStatus(UNAUTHORIZED);
  }
});

// ========== API routes ==========
// Root
app.get('/api', (req, res) => {
  res.send({
    links: {
      vehicles: '/api/vehicles',
      launches: '/api/launches',
      launchpads: '/api/launchpads',
      messages: '/api/messages'
    }
  });
})

// Vehicles collection
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
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .post((req, res) => {
    if (req.user) {
      if (isValid(req.body, vehicleKeys.slice(0, 1))) {
        addVehicle(req.user, req.body).then(elem => {
          res.send(elem);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + vehicleKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// A vehicle
app.route('/api/vehicles/:id')
  .get((req, res) => {
    getVehicles(req.user, req.params.id).then(elem => {
      if (elem) {
        res.send({
          data: elem,
          links: {
            vehicles: '/api/vehicles',
            vehicle_launches: '/api/launches?vehicle=' + elem.id
          }
        });
      } else {
        res.sendStatus(NOT_FOUND);
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .put((req, res) => {
    if (req.user) {
      if (isValid(req.body, vehicleKeys.slice(0, 1))) {
        updateVehicle(req.user, req.params.id, req.body).then(elem => {
          res.send(elem);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + vehicleKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  })
  .delete((req, res) => {
    if (req.user) {
      deleteVehicle(req.user, req.params.id).then(elem => {
        if (elem) {
          res.sendStatus(OK);
        } else {
          res.sendStatus(NOT_FOUND)
        }
      }).catch(err => {
        console.log(err);
        res.sendStatus(ERROR);
      })
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// Launches collection. /api/launches, /api/launches?vehicle=<id>, /api/launches?launchpad=<id>
app.route('/api/launches')
  .get((req, res) => {
    getLaunches(req.user, null, req.query.vehicle, req.query.launchpad).then(data => {
      res.send({
        data: data,
        links: {
          launch: '/api/launches/<flight_number>',
          vehicle_launches: '/api/launches?vehicle=<id>',
          launchpad_launches: '/api/launches?launchpad=<id>'
        }
      });
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .post((req, res) => {
    if (req.user) {
      if (isValid(req.body, launchKeys.slice(0, 4))) {
        addLaunch(req.user, req.body).then(elem => {
          res.send(elem);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchKeys.slice(0, 4));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// A launch
app.route('/api/launches/:id')
  .get((req, res) => {
    getLaunches(req.user, Number(req.params.id)).then(elem => {
      if (elem) {
        res.send({
          data: elem,
          links: {
            launches: '/api/launches',
            launch_vehicle: '/api/vehicle/' + elem.rocket.rocket_id,
            launch_launchpad: '/api/launchpads/' + elem.launch_site.site_id
          }
        });
      } else {
        res.sendStatus(NOT_FOUND);
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .put((req, res) => {
	console.log(req.body);
    if (req.user) {
      if (isValid(req.body, launchKeys.slice(0, 4))) {
        updateLaunch(req.user, Number(req.params.id), req.body).then(elem => {
          res.send(elem);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchKeys.slice(0, 4));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  })
  .delete((req, res) => {
    if (req.user) {
      deleteLaunch(req.user, Number(req.params.id)).then(data => {
        if (elem) {
          res.sendStatus(OK);
        } else {
          res.sendStatus(NOT_FOUND);
        }
      }).catch(err => {
        console.log(err);
        res.sendStatus(ERROR);
      })
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// Launchpads collection
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
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .post((req, res) => {
    if (req.user) {
      if (isValid(req.body, launchpadKeys.slice(0, 1))) {
        addLaunchpad(req.user, req.body).then(data => {
          res.send(data);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchpadKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// A launchpad
app.route('/api/launchpads/:id')
  .get((req, res) => {
    getLaunchpads(req.user, req.params.id).then(elem => {
      if (elem) {
        res.send({
          data: elem,
          links: {
            launchpads: '/api/launchpads',
            launchpad_launches: '/api/launches?launchpad=' + elem.id
          }
        });
      } else {
        res.sendStatus(NOT_FOUND);
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .put((req, res) => {
    if (req.user) {
      if (isValid(req.body, launchpadKeys.slice(0, 1))) {
        updateLaunchpad(req.user, req.params.id, req.body).then(elem => {
          res.send(elem);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + launchpadKeys.slice(0, 1));
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  })
  .delete((req, res) => {
    if (req.user) {
      deleteLaunchpad(req.user, req.params.id).then(elem => {
        if (elem) {
          res.sendStatus(OK);
        } else {
          res.sendStatus(NOT_FOUND);
        }
      }).catch(err => {
        console.log(err);
        res.sendStatus(ERROR);
      })
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// Messages collection
app.route('/api/messages')
  .get((req, res) => {
    getMessages().then(data => {
      res.send(data);
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .post((req, res) => {
    if (req.user === 'admin') {
      if (isValid(req.body, messageKeys)) {
        addMessage(req.body).then(elem => {
          res.send(elem);
        }).catch(err => {
          console.log(err);
          res.sendStatus(ERROR);
        })
      } else {
        res.status(INVALID_FORMAT);
        res.send("Missing required properties: " + messageKeys);
      }
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// A message
app.route('/api/messages/:id')
  .get((req, res) => {
    getMessages(req.params.id).then(elem => {
      if (elem) {
        res.send(elem);
      } else {
        res.sendStatus(NOT_FOUND);
      }
    }).catch(err => {
      console.log(err);
      res.sendStatus(ERROR);
    })
  })
  .delete((req, res) => {
    if (req.user === 'admin') {
      deleteMessage(Number(req.params.id)).then(elem => {
        if (elem) {
          res.sendStatus(OK);
        } else {
          res.sendStatus(NOT_FOUND);
        }
      }).catch(err => {
        console.log(err);
        res.sendStatus(ERROR);
      })
    } else {
      res.sendStatus(UNAUTHORIZED);
    }
  });

// ========== Connect to database and Start server ==========
MongoClient.connect(dbURL, (err, res) => {
  if (err) {
    console.log(err);
  } else {
    db = res;
    collection = db.collection(COLLECTION_NAME);
    console.log("Connected to database using collection " + COLLECTION_NAME);

    // Set up messages array
    collection.insertOne({
      user: "admin",
      password: "admin",
      messages: JSON.stringify([])
    }).catch(err => {
      console.log(err);
    })

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
      console.log("(user " + user + " already exists)");
      return Promise.resolve(false);
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
            console.log("(added user", user, "with password", password + ")");
            return true;
          });
        });
      });
    });
  });
}

// The keys used for each element
const vehicleKeys = ['name', 'id', 'description', 'active', 'first_flight', 'cost_per_launch', 'success_rate_pct'];
const launchKeys = ['rocket.rocket_id', 'rocket.rocket_name', 'launch_site.site_id', 'launch_site.site_name_long', 'flight_number', 'details', 'rocket', 'launch_site', 'launch_date_local', 'launch_success'];
const launchpadKeys = ['full_name', 'id', 'details', 'status', 'location'];
const messageKeys = ['data'];

// Helper function to validate input
function isValid(elem, keys) {
  for (var key of keys) {
    var key1 = key.split('.')[0];
    var key2 = key.split('.')[1];
    if (!elem.hasOwnProperty(key1)) {
      return false;
    }
    if (key2 && !elem[key1].hasOwnProperty(key2)) {
      return false;
    }
  }
  return true;
}

// Helper function to remove extra keys from data
function removeKeys(data, keysToKeep) {
  if (data instanceof Array) {
    data.forEach(elem => {
      Object.keys(elem).forEach(key => {
        if (!keysToKeep.includes(key)) {
          delete elem[key];
        }
      });
    });
  } else {
    Object.keys(data).forEach(key => {
      if (!keysToKeep.includes(key)) {
        delete data[key];
      }
    });
  }
}

/*Helper functions to format data properly from browser form
 Input is req.body
*/
function launchesFormHelper(data) {
	if (!data.hasOwnProperty('rocket') && data.hasOwnProperty('rocket_id') && data.hasOwnProperty('rocket_name')) {
		data['rocket'] = {rocket_id: data['rocket_id'], rocket_name: data['rocket_name']};
	}
	if (!data.hasOwnProperty('launch_site') && data.hasOwnProperty('site_id') && data.hasOwnProperty('site_name_long')) {
		data['launch_site'] = {site_id: data['site_id'], site_name_long:data['site_name_long']};
	}
	console.log(data);
}

function launchpadsFormHelper(data) {
	if (!data.hasOwnProperty('location') && data.hasOwnProperty('name') && data.hasOwnProperty('region')) {
		data['location'] = {name: data['name'], region: data['region']};
	}
	console.log(data);
}

// ========== Get data from Space-X API or database ==========
function getVehicles(user, id) {
  if (user) {  // Logged in
    // Use database
    return collection.find({user: user}).limit(1).next().then(res => {
      if (id) {
        return JSON.parse(res.vehicles).find(elem => elem.id === id);
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
          if (res.statusCode === 200) {
            var data = JSON.parse(body);
            removeKeys(data, vehicleKeys);
            resolve(data);
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
        return JSON.parse(res.launches).find(elem => elem.flight_number === id);
      } else if (vehicle_id) {
        return JSON.parse(res.launches).filter(elem => elem.rocket.rocket_id === vehicle_id);
      } else if (launchpad_id) {
        return JSON.parse(res.launches).filter(elem => elem.launch_site.site_id === launchpad_id);
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
          var data = JSON.parse(body);
          removeKeys(data, launchKeys);
          if (id) {
            resolve(data.find(elem => elem.flight_number === id));
          } else {
            resolve(data);
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
        return JSON.parse(res.launchpads).find(elem => elem.id === id);
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
          if (res.statusCode === 200) {
            var data = JSON.parse(body);
            removeKeys(data, launchpadKeys);
            resolve(data);
          } else {
            resolve(undefined);
          }
        }
      });
    });
  }
}

// ========== Add element to collection in database ==========
function addVehicle(user, elem) {
  return getVehicles(user).then(data => {
    var id = elem.name.split(' ').join('').toLowerCase();
    elem.id = id;
    data.push(elem);
    return collection.updateOne({user: user}, {$set: {vehicles: JSON.stringify(data)}}).then(res => {
      console.log("(" + user + " added vehicle " + JSON.stringify(elem) + ")");
      return elem;
    })
  })
}

function addLaunch(user, elem){
  return getLaunches(user).then(data => {
    var id = Math.max.apply(Math, data.map(elem => elem.flight_number)) + 1;
    elem.flight_number = id;
    data.push(elem);
    return collection.updateOne({user: user}, {$set: {launches: JSON.stringify(data)}}).then(res => {
      console.log("(" + user + " added launch " + JSON.stringify(elem) + ")");
      return elem;
    })
  })
}

function addLaunchpad(user, elem){
  return getLaunchpads(user).then(data => {
    var id = elem.full_name.split(' ').join('_').toLowerCase();
    elem.id = id;
    data.push(elem);
    return collection.updateOne({user: user}, {$set: {launchpads: JSON.stringify(data)}}).then(res => {
      console.log("(" + user + " added launchpad " + JSON.stringify(elem) + ")");
      return elem;
    })
  })
}

// ========== Update element in collection in database ==========
function updateVehicle(user, id, elem) {
  return getVehicles(user).then(data => {
    elem.id = id;
	//Finds item by mapping
    var index = data.map(elem => elem.id).indexOf(id);
    if (index === -1) {
      data.push(elem);
    } else {
      data[index] = elem;
    }
    return collection.updateOne({user: user}, {$set: {vehicles: JSON.stringify(data)}}).then(res => {
      console.log("(" + user + " updated vehicle " + JSON.stringify(elem) + ")");
      return elem;
    })
  })
}

function updateLaunch(user, id, elem) {
  return getLaunches(user).then(data => {
    elem.flight_number = id;
	//Finds item by mapping
    var index = data.map(elem => elem.flight_number).indexOf(id);
    if (index === -1) {
      data.push(elem);
    } else {
      data[index] = elem;
    }
    return collection.updateOne({user: user}, {$set: {launches: JSON.stringify(data)}}).then(res => {
      console.log("(" + user + " updated launch " + JSON.stringify(elem) + ")");
      return elem;
    })
  })
}

function updateLaunchpad(user, id, elem) {
  return getLaunchpads(user).then(data => {
    elem.id = id;
	//Finds item by mapping
    var index = data.map(elem => elem.id).indexOf(id);
    if (index === -1) {
      data.push(elem);
    } else {
      data[index] = elem;
    }
    return collection.updateOne({user: user}, {$set: {launchpads: JSON.stringify(data)}}).then(res => {
      console.log("(" + user + " updated launchpad " + JSON.stringify(elem) + ")");
      return elem;
    })
  })
}

// ========== Delete element to collection in database ==========
function deleteVehicle(user, id) {
  return getVehicles(user).then(data => {
    var index = data.map(elem => elem.id).indexOf(id);
    if (index === -1) {
      return Promise.resolve(undefined);
    } else {
      var elem = data[index];
      data.splice(index, 1);
      return collection.updateOne({user: user}, {$set: {vehicles: JSON.stringify(data)}}).then(res => {
        console.log("(" + user + " deleted vehicle " + JSON.stringify(elem) + ")");
        return elem;
      })
    }
  })
}

function deleteLaunch(user, id) {
  return getLaunches(user).then(data => {
    var index = data.map(elem => elem.flight_number).indexOf(id);
    if (index === -1) {
      return Promise.resolve(undefined);
    } else {
      var elem = data[index];
      data.splice(index, 1);
      return collection.updateOne({user: user}, {$set: {launches: JSON.stringify(data)}}).then(res => {
        console.log("(" + user + " deleted launch " + JSON.stringify(elem) + ")");
        return elem;
      })
    }
  })
}

function deleteLaunchpad(user, id) {
  return getLaunchpads(user).then(data => {
    var index = data.map(elem => elem.id).indexOf(id);
    if (index === -1) {
      return Promise.resolve(undefined);
    } else {
      var elem = data[index];
      data.splice(index, 1);
      return collection.updateOne({user: user}, {$set: {launchpads: JSON.stringify(data)}}).then(res => {
        console.log("(" + user + " deleted launchpad " + JSON.stringify(elem) + ")");
        return elem;
      })
    }
  })
}

// ========== Get/Add/Delete messages from database ==========
function getMessages(id) {
  return collection.find({user: "admin"}).limit(1).next().then(res => {
    if (id) {
      return JSON.parse(res.messages).find(elem => elem.id === id);
    } else {
      return JSON.parse(res.messages);
    }
  });
}

function addMessage(elem) {
  return getMessages().then(data => {
    if (data.length == 0) {
      var id = 0;
    } else {
	  //Calculate a new unique id
      var id = Math.max.apply(Math, data.map(elem => elem.id)) + 1;
    }
    elem.id = id;
    data.push(elem);
    return collection.updateOne({user: "admin"}, {$set: {messages: JSON.stringify(data)}}).then(res => {
      console.log("(added message " + JSON.stringify(elem) + ")");
      return elem;
    })
  })
}

function deleteMessage(id) {
  return getMessages().then(data => {
    var index = data.map(elem => elem.id).indexOf(id);
    if (index === -1) {
      return Promise.resolve(undefined);
    } else {
      var elem = data[index];
      data.splice(index, 1);
      return collection.updateOne({user: "admin"}, {$set: {messages: JSON.stringify(data)}}).then(res => {
        console.log("(deleted message " + JSON.stringify(elem) + ")");
        return elem;
      })
    }
  })
}
