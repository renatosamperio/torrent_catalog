const rosnodejs = require('rosnodejs');
const lib = require('mongodb');

/* 
 * This mongo connector defines a one-to-one client between 
 * one ROS nodejs Node and one MongoDb collection.
 */

// Initialize.
let mongo = {

    // TODO: Update for allowing more connections.
    'connection': {
        'db_name': undefined,
        'coll_name': undefined,
        'host_url': undefined,
        'client': undefined,
        'db': undefined,
        'collection': undefined,
    }
};

/**
 * Start MongoDB server.
 * 
 * @param {string} host_url - Host url.
 * @param {string} db_name - Database name.
 * @param {string} collection - Collection name.
 */
mongo.start = function (host_url, db_name, collection) {

    // Storing only one connection.
    mongo.connection.host_url = host_url;
    mongo.connection.db_name = db_name;
    mongo.connection.coll_name = collection;

    // Configuring a single connection.
    mongo.configure(mongo.connection);

};

/**
 * Configure MongoDB connection.
 * 
 * @param {object} connection - Connection configuration.
 */
mongo.configure = function (connection) {

    var options = {
        useNewUrlParser: true,
        useUnifiedTopology: true
    };
    let host_url = connection.host_url;
    let db_name = connection.db_name;
    let collection = connection.coll_name;

    // Setting up Mongo DB client.
    mongo.connection.client = lib.MongoClient(host_url, options);

    // Calling local connect method.
    // Use connect method to connect to the server.
    mongo.connection.client.connect(function (err) {

        if (err) {
            rosnodejs.log.warn("Database not found");
            console.log(err);
        } else {
            mongo.connection.db = mongo.connection.client.db(db_name);
            mongo.connection.collection = mongo.connection.db.collection(collection);
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
mongo.query_promise = function (query, sortQuery = {}, limit=undefined) {

    if (mongo.connection.collection === undefined) {
        rosnodejs.log.warn("Undefined collection in MongoDb connector");
        return;
    }

    if (limit=== undefined)
    	var cursorArray = mongo.connection.collection.find(query).sort(sortQuery).toArray();
    else
    	var cursorArray = mongo.connection.collection.find(query).limit(50).sort(sortQuery).toArray();

    return cursorArray;

};

/**
 * Execute a query on MongoDB.
 * This method requires handles data within a callback.
 * 
 * @param {object} query - Query.
 * @param {function} callback - Callback.
 */
mongo.query = function (query, callback) {

    if (mongo.connection.collection === undefined) {
        rosnodejs.log.warn("Undefined collection in MongoDb connector");
        return;
    }

    mongo.connection.collection.find(query).toArray(
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
    mongo.db.close();
    mongo.client.close();
};

module.exports.mongo = mongo;