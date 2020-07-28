const rosnodejs = require('rosnodejs');
const lib = require('mongodb');

/* 
 * This mongo connector defines a one-to-one client between 
 * one ROS nodejs Node and one MongoDb collection.
 */

// Initialize.
let mongo = {
		
	// prepare internal logging
	'log': rosnodejs.log,
	
    // TODO: Update for allowing more connections.
    'connection': {
        'db_name': undefined,
        'coll_name': undefined,
        'host_url': undefined,
        'client': undefined,
        'dbs': undefined,
        
        // new items
        'client': {},
        'db': {},
        'collection': undefined,
    },
    'connections': {},
};

/**
 * Start MongoDB server.
 * 
 * @param {string} host_url - Host url.
 * @param {string} db_name - Database name.
 * @param {string} collection - Collection name.
 */
mongo.start = function (host_url, db_name, collection, name) {

 	$CA.log.debug('Setting up connections');
    // Storing only one connection.
	mongo.log.debug('Starting mongo client for '+name);
    mongo.connection.host_url  = host_url;
    mongo.connection.db_name   = db_name;
    mongo.connection.coll_name = collection;

    // Configuring a single connection.
 	$CA.log.debug('Connecting to DBS');
    mongo.connect(host_url, db_name, collection, name);

};

/**
 * Configure MongoDB connection.
 * 
 * @param {string} url - server url.
 * @param {string} dbs - database name.
 */
mongo.connect = function (url, dbs) {

    // Setting up Mongo DB client.
//    mongo.client = lib.MongoClient;
    let db_url   = url+'/'+dbs;
    let dbUrl    = "mongodb://localhost:27017/galaxy";

    // Calling local connect method.
    // Use connect method to connect to the server.
    var options = {
        useNewUrlParser:    true,
        useUnifiedTopology: true
    };
    
    // Creating client and DBS connection
//    mongo.connection.client = require('mongodb').MongoClient;
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect(db_url, options, function(err, client) {
    	  if(err) { return console.dir(err); }
    	  mongo.connection.client =client;
    	  mongo.log.debug('Setting up MongoDb generic client for '+dbs);
	});
};

/**
 * Configure MongoDB connection.
 * 
 * @param {object} connection - Connection configuration.
 * @param {string} url - server url.
 * @param {string} dbs - database name.
 * @param {string} name - connection name.

 */
mongo.connect_collection = function (url, dbs, collection, name) {

    var options = {
        useNewUrlParser:    true,
        useUnifiedTopology: true
    };
    
    // creating namespace for connection
    if ( !(name in mongo.connections) ){
    	mongo.connections[name] = {};
    	mongo.log.debug('Created namespace for '+name);
    }
    
    mongo.connections[name].dbs        = dbs;
    mongo.connections[name].url        = url;
    mongo.connections[name].collection = collection;
    
    // Setting up Mongo DB client.
    mongo.connections[name].client     = lib.MongoClient(url, options);

    // Calling local connect method.
    // Use connect method to connect to the server.
    mongo.connections[name].client.connect(function (err) {

        if (err) {
        	mongo.log.warn("Database not found");
            console.log(err);
        } else {
            mongo.connections[name].db         = mongo.connections[name].client.db(dbs);
            mongo.connections[name].collection = mongo.connections[name].db.collection(collection);
            mongo.log.debug('Connected to '+dbs+'.'+collection);
        }

    });

};

/**
 * Execute a query on MongoDB.
 * This method requires handling the promise on client side:
 *     cursorArray.then(function(err, result) {
 *         console.log(result) // "Some User token"
 *     });
 * 
 * @param {object} query - Query.
 * @param {object} sortQuery - Sort.
 */
mongo.query_promise = function (connection, query, sortQuery = {}, limit=undefined) {

    if (connection === undefined) {
    	mongo.log.warn("Undefined connection in MongoDb connector");
        return;
    }
    
    if (connection.collection === undefined) {
    	mongo.log.warn("Undefined collection in MongoDb connector");
        return;
    }

    // limiting sort to 50 by default
    if (limit=== undefined)
    	var limit = 50;

	var cursorArray = connection.collection.find(query).limit(limit).sort(sortQuery).toArray();
    return cursorArray;

};

/**
 * Execute a query on MongoDB.
 * This method requires handles data within a callback.
 * 
 * @param {object} query - Query.
 * @param {function} callback - Callback.
 */
mongo.query = function (connection, query, callback) {

    if (connection.collection === undefined) {
    	mongo.log.warn("Undefined collection in MongoDb connector");
        return;
    }

    connection.collection.find(query).toArray(
        function (err, docs) {
            if (err) throw err;
            callback(docs);
        }
    );

};

/**
 * Close MongoDB connection.
 */
mongo.close = function () {

	// Get connections from mongo handler
	let connections = mongo.connections;
	
	// Disconnect all connections
	let conn_names = Object.keys(connections);
	for (let i=0; i < conn_names.length; i++ ){
		let name = conn_names[i];
		connections[name].client.close();
		connections[name].db.close();
		$CA.log.debug('Closed connection to '+name);
	}
};

module.exports.mongo = mongo;