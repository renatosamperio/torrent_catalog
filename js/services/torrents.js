
(function (definition) {

    module.exports = definition();

})(function () {

    var module = this;

    var $CA = {};
    var $ROS = {};

    /**
     * Start services.
     * 
     * @param {object} NO_NAME - DESCRIPTION.
     */
    module.torrents = {};

    /**
     * Run all the functions needed to start the app.
     * 
     * @param {object} hc - Honeycomb global variables and methods.
     * @param {object} ros - ROS global variables and methods.
     */
    module.torrents.start = function (ca, ros, db) {

        $CA  = ca;
        $ROS = ros;
        $DB  = db;
    	$CA.log.info('Starting all services');

    };

    /**
     * Stop services.
     * 
     * @param {object} NO_NAME - DESCRIPTION.
     */
    module.torrents.stop = function () {

    	$CA.log.info('Stopping all services');
    }

    /**
     * Retrieve latest torrents in DB.
     * 
     * @param {object} NO_NAME - DESCRIPTION.
     */
    module.torrents.latest = function (req, res) {
    	 
    	var latest_torrents = [];
        var name   = 'torrents';

		$CA.log.debug('Setting up connection client');
    	var client = $DB.mongo.connection.client;
		var db = client.db('galaxy');
		var torrents = client.db(name);

    	// Setting up time of latest torrents
    	var date_latest = new Date();
    	date_latest.setHours(date_latest.getHours() - 6);
    	var query = 
    	{ 
			'$and': 
			[
				{'imdb_code':       { '$exists': true}}, 
				{'torrent_updated': { '$exists': true}}, 
				{'torrent_updated': { '$gte':    date_latest}} 
			]
    	};
    	
    	// Looking into latest torrents with an aggregation
		$CA.log.debug('Aggretating torrents and imdb');
    	var pipeline = [
		    {'$match' : query},
		    {'$lookup': {
		        'from':         "imdb",
		        'localField':   "imdb_code",
		        'foreignField': "imdb_id",
		        'as':           "imdb"}},
		    {'$unwind' : "$imdb"},
		];
    	
    	// Collecting torrents and rendering
    	var aggCursor = db.collection(name).aggregate(pipeline);
		aggCursor.forEach(items => {
			latest_torrents.push(items);
		}).then(function(imdb_info) {
			$CA.log.debug('Rendering latest ['+latest_torrents.length+'] torrents');
	        var latest = { 'latest': latest_torrents };
			res.render('latest', latest);
    	});
		
        return;
    	
    }
    
    return module;
});