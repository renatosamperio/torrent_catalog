const express = require('express');
const http = require('http');
const path = require('path');

(function (definition) {

    module.exports = definition();

})(function () {

    var module = this;

    var $CA = {};
    var $ROS = {};

    module.start = {
        'run': {}
    };

    /**
     * Run all the functions needed to start the app.
     * 
     * @param {object} hc - Honeycomb global variables and methods.
     * @param {object} ros - ROS global variables and methods.
     */
    module.start.run.all = function (hc, ros) {

        $CA = hc;
        $ROS = ros;
        $CA.start.run.webserver();

    };

    /**
     * Start Express.js and Socket.io servers.
     */
    module.start.run.webserver = function () {

    	var catalog = $ROS.parameters['/catalog'].value;
   	 	if (catalog === undefined){
   	    	$CA.log.error('Missing DB parameters, exiting...');
   	    	$CA.catalog.stop();
   	 	}
   	 	
   	 	// creating express and http server
        $CA.express_instance = express();
        $CA.server_instance = http.createServer($CA.express_instance);
        $CA.server_instance.listen(catalog.port);

        // setting base route
        $CA.express_instance.use('', express.static(catalog.public_path));
        
        // viewed at http://localhost:3000
        $CA.express_instance.get('/', function(req, res) {
            res.sendFile(path.join(__dirname + 'index.html'));
        });
    };

    return module;

});