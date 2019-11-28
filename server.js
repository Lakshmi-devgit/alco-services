//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    ObjectID = require('mongodb').ObjectID;

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }))
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL ,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME || true) {
    var mongoServiceName = "";
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'] || '127.0.0.1';
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'] || '49447';
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'] || 'alcocheck_inndata_db';
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'] || 'alchocheck_superpassword';
    mongoUser = process.env[mongoServiceName + '_USER'] || 'alcocheck_super';

  // If using env vars from secret from service binding  
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('userData');
    // Create a document with request IP and current time of request
    // col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

// app.get('/');

app.get('/create-newuser' ,function (req ,res) {

  // res.send('{Welcome to create new user}');
  // console.log(req.body);
  res.send('Welcome to create user');

  // db.collection('userData').createUser({
  //   user: "test-user",
  //   pwd: "alcouser",
  //   roles: ["user"]
  // });

});

app.get('/insert-testresults' , function(req , res) {
  var objId =  new ObjectID(req.body.userId);
  console.log('objId : ' , objId);
  // console.log(req.body.userId);
  console.log(req.body.user_current_location);
  console.log(req.body.testValue);
  console.log(req.body.testTakenTime);
  var orgId =  new ObjectID(req.body.orgId);
  console.log('orgId : ' , orgId);
  // console.log(req.body.orgId);
  console.log(req.body.faceMatchFailedAtResult);
  console.log(req.body.resultStatus);
  console.log(req.body.result_video);

  var doc = {
    "userId" : objId ||  new ObjectID(),
    "user_current_location" : req.body.user_current_location || [0.0 , 0.0],
    "testValue" : req.body.testValue || 0.0,
    "testTakenTime" : req.body.testTakenTime || "01-01-2019 12:01",
    "orgId" : orgId || new ObjectID(),
    "faceMatchFailedAtResult" : req.body.faceMatchFailedAtResult || true,
    "resultStatus" : req.body.resultStatus || "pass",
    "result_video" : req.body.result_video || "testUrl"

  };

 if (!db) {
    initDb(function(err){});
  }
  if (db) {
      db.collection('testResult').insertOne(doc , function(err , resp) {
        if (err) throw err;
        console.log("Document inserted");
      });
  }else {
    res.send('unable to find database');
  }

  res.send('insert results are succes');
});




app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('userData').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
