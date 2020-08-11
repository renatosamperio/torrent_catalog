
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
    module.torrents = {
		'state': {}
    };

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

		$CA.log.debug('Setting up connection client');
    	var client = $DB.mongo.connection.client;

        let name       = 'latest';
        let db_name    = 'galaxy';
        let hrs_back   = 12;
        let db         = client.db(db_name);
        let collection = db.collection(name);
        
    	// Setting up time of latest torrents
        let date_latest = new Date();
    	date_latest.setHours(date_latest.getHours() - hrs_back);
    	let query = {'last_updated' : { '$gte': date_latest }};

    	// Searching items
        collection.find(query).toArray( function(err, result) {
          if (err) throw err;
          $CA.log.debug('Got ['+result.length+'] latest torrents');
          var latest_torrents = [];
          for (let i=0; i<result.length; i++){
        	  var item = result[i];
        	  latest_torrents.push(item);
//        	  console.log(item);
          }
          var latest = { 'latest': latest_torrents };
          $CA.torrents.state = latest;
          $CA.log.debug('Rendering latest ['+latest_torrents.length+'] torrents');
          res.render('latest', latest);
        });
        return;
    	
    }

    /**
     * Send message to download torrents
     * 
     * @param {object} NO_NAME - DESCRIPTION.
     */
    module.torrents.download = function (req, res) {
        let selected = JSON.parse(req.body.selected_torrent);
        var magnet = selected['magnet']
        $CA.log.debug('Starting download of [%s]'%selected['galaxy_id']);
        var msg = {
        	'magnet': magnet
        }
        $ROS.publish('/yts_finder/torrents_to_download', msg);

    	// Rendering latest torrents again
        var latest = { 'latest': $CA.torrents.state.latest };
        $CA.log.debug('Rendering from state ['+latest.latest.length+'] torrents');
		res.render('test', latest);
		return;
    }

    /**
     * Retrieve latest torrents in DB.
     * 
     * @param {object} NO_NAME - DESCRIPTION.
     */
    module.torrents.test = function (req, res) {
		$CA.log.debug('Setting up connection to test DB');
    	var client = $DB.mongo.connection.client;

        let name       = 'test';
        let db_name    = 'galaxy';
        let hrs_back   = 12;
        let db         = client.db(db_name);
        let collection = db.collection(name);
        
    	// Setting up time of latest torrents
        let date_latest = new Date();
    	date_latest.setHours(date_latest.getHours() - hrs_back);
    	let query = {'last_updated' : { '$gte': date_latest }};
    	query = {};

    	// Searching items
        collection.find(query).toArray( function(err, result) {
          if (err) throw err;
          $CA.log.debug('+ Got ['+result.length+'] test torrents');
          var latest_torrents = [];
          for (let i=0; i<result.length; i++){
        	  var item = result[i];
        	  latest_torrents.push(item);
        	  // console.log(item);
          }
          
          // Setting collected data
          var latest = { 'latest': latest_torrents };
          $CA.torrents.state = latest;
          $CA.log.debug('Rendering latest ['+latest_torrents.length+'] torrents');
          res.render('test', latest);
        });
        return;

    }

    /**
     * Retrieve latest torrents in DB.
     * 
     * @param {object} NO_NAME - DESCRIPTION.
     */
    module.torrents.rewrite = function (req, res) {
        let selected = JSON.parse(req.body.selected_torrent);
        var galaxy_id= selected['galaxy_id'];
        $CA.log.debug('Updating torrent ['+selected+']');
        $ROS.publish('/galaxy_imdb/update_torrent', {'data': galaxy_id});
        
    	// Rendering latest torrents again
        var latest = { 'latest': $CA.torrents.state.latest };
        $CA.log.debug('Rendering from state ['+latest.latest.length+'] torrents');
		res.render('test', latest);
		
        return;

    }

    return module;
});