const express = require('express');
const http = require('http');
const path = require('path');
const rosnodejs = require('rosnodejs');

(function (definition) {

    module.exports = definition();

})(function () {

    var module = this;

    var $CA = {};
    var $ROS = {};

    module.start = {
        'run': {}
    };
    module.stop = {
        'run': {}
    };

    /**
     * Run all the functions needed to start the app.
     * 
     * @param {object} hc - Honeycomb global variables and methods.
     * @param {object} ros - ROS global variables and methods.
     */
    module.start.run.all = function (ca, ros, db) {

        $CA  = ca;
        $ROS = ros;
        $DB  = db;
    	$CA.log.info('Starting all modules');
        $CA.start.run.webserver();
        $CA.start.run.mongo();
    };

    /**
     * Start Express.js and Socket.io servers.
     */
    module.start.run.webserver = function () {

    	var catalog = $ROS.parameters['/catalog'].value;
   	 	if (catalog === undefined){
   	    	$CA.log.error('Missing DB parameters, exiting...');
   	    	rosnodejs.shutdown();
   	 	}
   	 	
   	 	// creating express and http server
        $CA.express_instance = express();
        $CA.server_instance = http.createServer($CA.express_instance);

        // setting usage port
        $CA.server_instance.listen(catalog.port);

    	
        // setting base route
        $CA.express_instance.use('', express.static(catalog.public_path));

        // setting view model
    	$CA.express_instance.set('view engine', 'ejs');
    	$CA.express_instance.set('views', 
    			catalog.public_path + '/views');
    	
    	// Defining service paths
    	$CA.express_instance.get( '/latest', $CA.torrents.latest);
    	
        // viewed at http://localhost:3000
        $CA.express_instance.get('/', function(req, res) {
            res.sendFile(path.join(catalog.public_path + 'index.html'));
        });
        $CA.log.info('Starting HTTP server in http://localhost:3000');
    };


    /**
     * Run all the functions needed to start the app.
     * 
     * @param {object} hc - Honeycomb global variables and methods.
     * @param {object} ros - ROS global variables and methods.
     */
    module.start.run.mongo = function ()
    {
    	var catalog = $ROS.parameters['/catalog'].value;
   	 	if (catalog === undefined){
   	    	$CA.log.error('Missing DB parameters, exiting...');
   	    	rosnodejs.shutdown();
   	 	}
   	 	let dbs = catalog.database.dbs;
   	 	let url = catalog.database.url;
   	 	$CA.log.debug('Starting Mongo client');
   	 	$DB.mongo.connect(url, dbs);
   	 
        
    };

    /**
     * Close MongoDB connection.
     * 
     * @param {object} connection - Connection configuration.
     */
    module.stop.run.mongo = function () {
    	
    	// Stopping mongo clients
    	$DB.mongo.close();
    }
    
    return module;
});
