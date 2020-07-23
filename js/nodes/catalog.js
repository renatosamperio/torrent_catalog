/**
 * Purpose of catalog:
 *     Interacti with internal ROS nodes.
 *     Execute web server.
 */

const _ = require('lodash');

let catalog = {};

var $CA = {

    'args': {},
    'express_instance': false,
    'server_instance': false,

};


catalog.start = function startCatalog(callback) {
    console.log('Starting catalog service...');

    // Include most relevant packages.
    console.log('Require main packages...');
    const $ROS= require('./../ros/ros_lib');
    const $DB = require('./../utils/mongo');
    console.log('Finished requiring main packages.');

    // Include util functions.
    $ROS.nodejs.log.info('Require util functions...');
    $CA = _.merge($CA, require('./../utils/start/run'));
    
    // Load ROS setup files.
    $ROS.nodejs.log.info('Load ROS setup files...');
    require('./../ros/load_messages')($ROS);
    require('./../ros/loggers')($CA, $ROS);
    require('./../ros/parameters')($ROS);
    require('./../ros/publishers')($ROS);
    require('./../ros/subscribers')($CA, $ROS);

    //  ROS start.
    $ROS.subscribers_inactive = true;

    $ROS.nodejs.log.info('Starting ROS...');
    $ROS.init(
            'torrent_catalog', // ROS node name.
            // Callback.
            function () {
                // Setting up stuff
                $ROS.nodejs.log.info('ROS started.');
                $ROS.nodejs.log.info('Starting torrent catalog ROS connections...');

                // $ROS can now execute the messages that were stored; and is now free to execute messages as they come in.
                $ROS.nodejs.log.info('Executing ROS messages receives while subscribers were inactive...');
                $ROS.execute_last_messages_received_while_subscribers_inactive();
                $ROS.subscribers_inactive = false;

                // Start everything else: the web-socket, the inference-socket, etc.
                $ROS.nodejs.log.info('Starting Express.js web server with socket.io...');
                $CA.start.run.all($CA, $ROS);
                $ROS.nodejs.log.info('Honeycomb started.');

                return callback($CA, $ROS);
            }
    );
};

catalog.stop = function startCatalog(callback) {

    // Close Express.js.
    $CA.server_instance.close();

    return callback();

};

module.exports = catalog;
