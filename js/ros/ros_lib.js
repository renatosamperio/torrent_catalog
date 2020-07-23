const rosnodejs = require('rosnodejs');
const async = require('async');

let ros_lib = {};

let node = false; // Reference to the 'rosNode' that we get upon calling nodejs.initNode.

let subscribers_inactive = false; // the calling-code can turn subscribers on/off
let last_messages_received_while_subscribers_inactive = {
    /* topic(string) => message */
};

// Just a repository, for convenience/consistency; not used directly by this (i.e. the library),
// but should be used by the calling code.
ros_lib.msgs = {
    // (key => value) || (namespace => key => value)
};

ros_lib.srv = {
	    // (key => value) || (namespace => key => value)
};

let publishers = {
    /*
    'topic': { 
        msg_type: '', 
        publisher // set by lib, on init.
    }
    */
};

let subscribers = {
    /*
    'topic': { 
        msg_type: '', 
        callback: function()
    }
    */
};

let actions = {
    /*
    'action_server': { 'action_name': { 
        callbacks:  { 'event': function() }, 
        client      // set by lib, on init
    }}
    */
};

let services = {
	'requests': {},
	'replies': {}

    /*
    'requests': { 
    	'service_name':{
        	msg_type: '',
         }
    }
    'replies': { 
        msg_type: '', 
    }
    */
};

ros_lib.parameters = {
    // 'name': value
};

/**
 * Initialise ROS library.
 * 
 * @param {string} node_name - Name of the ROS node.
 * @param {function} callback - Callback.
 */
ros_lib.init = function (node_name, callback) {
    
    // Init node (i.e. the ROS node), and then do stuff.
    rosnodejs.initNode(node_name).then((rosNode) => {

        // Save node.
        node = rosNode;

        // Load all ROS parameters before adding publishers, subscribers and actions.
        async.eachOf(ros_lib.parameters, function(parameter_value, parameter_name, callbackParameters) {

            rosnodejs.log.debug('Loading ROS parameter: ' + parameter_name);

            // Load parameter.
            ros_lib.reload_parameter(
                parameter_name,
                function () {

                    rosnodejs.log.debug('Loaded ROS parameter: ' + parameter_name);

                    callbackParameters();
                }
            );

        // After all ROS parameters have been loaded successfully.
        }, function(err) {

            if( err ) {

                // If there was an error.
                rosnodejs.log.error('An error occured while loading parameters');
                rosnodejs.log.error(err);

                callback(err);

            } else {

                rosnodejs.log.info('All parameters have loaded successfully');

                // Add Publishers.
                for (var _publisher_topic in publishers) {

                    rosnodejs.log.debug('Advertising to topic: ' + _publisher_topic);

                    // Save publisher.
                    publishers[_publisher_topic].publisher = node.advertise(
                        _publisher_topic,
                        publishers[_publisher_topic].msg_type, {
                            'throttleMs': -1,
                            'tcpNoDelay': true,
                            'latching': publishers[_publisher_topic].is_latched
                        }
                    );

                }

                // Add Subscribers.
                for (var _subscriber_topic in subscribers) {

                    rosnodejs.log.debug('Subscribing to topic: ' + _subscriber_topic);

                    // Add callback.
                    node.subscribe(
                        _subscriber_topic,
                        subscribers[_subscriber_topic].msg_type,
                        subscribers[_subscriber_topic].callback, {
                            'throttleMs': -1
                        }
                    );

                }

                // Add Actions.
                for (var _action_server in actions) {

                    for (var _action_name in actions[_action_server]) {

                        rosnodejs.log.debug('Added action: ' + _action_server + ' => ' + _action_name);

                        // Save client.
                        actions[_action_server][_action_name].client = node.actionClientInterface(
                            _action_server,
                            _action_name
                        );

                        // Callback :: feedback.
                        if ('feedback' in actions[_action_server][_action_name].callbacks) {
                            actions[_action_server][_action_name].client.on(
                                'feedback',
                                actions[_action_server][_action_name].callbacks.feedback
                            );
                        }

                        // Callback :: status.
                        if ('status' in actions[_action_server][_action_name].callbacks) {
                            actions[_action_server][_action_name].client.on(
                                'status',
                                actions[_action_server][_action_name].callbacks.status
                            );
                        }

                        // Callback :: result.
                        if ('result' in actions[_action_server][_action_name].callbacks) {
                            actions[_action_server][_action_name].client.on(
                                'result', actions[_action_server][_action_name].callbacks.result
                            );
                        }

                    }

                }
                // Add Actions.
                for (var _service_name in services.requests) {

                    // Save client.
                    services.requests[_service_name].client = node.serviceClient(
                    		_service_name, 
                    		services.requests[_service_name].msg_type
                    );
                    rosnodejs.log.debug('Added service client request: ' + _service_name );
                }

                callback();

            }

        });


    });

};

/**
 * Add parameter to ROS library.
 * 
 * @param {string} param_name - Name of the ROS parameter.
 */
ros_lib.add_parameter = function (param_name) {

    // Node has already been initialized.
    if (node) {
        rosnodejs.log.debug('(add_parameter): Node has already been initialized; no more adding of parameters.');
        return;
    }

    ros_lib.parameters[param_name] = undefined;

};

/**
 * Reload parameter in ROS library.
 * 
 * @param {string} param_name - Name of the ROS parameter.
 * @param {function} callback - Callback.
 */
ros_lib.reload_parameter = function (param_name, callback) {

    // Node not initialized.
    if (node) {
        // Do nothing.
    } else {
        rosnodejs.log.warn('(reload_parameter): Node has not yet been initialized.');
        return;
    }

    // Parameter doesn't exist locally.
    if (ros_lib.parameters[param_name] || (ros_lib.parameters[param_name] === undefined)) {
        // Do nothing.
    } else {
        rosnodejs.log.warn('(reload_parameter): Parameter ' + param_name + ' is not defined locally');
        return;
    }

    // Check; load.
    node.hasParam(param_name).then((exists) => {

        // Parameter doesn't exist in ROS.
        if (exists) {
            // Do nothing.
        } else {

            // Log.
            rosnodejs.log.debug('(reload_parameter): Parameter ' + param_name + ' is not in ROS definitions');

            // Store as undefined.
            ros_lib.parameters[param_name] = {
                'value': undefined
            };

            // Call callback, if any.
            if (callback) {
                callback(param_name);
            }

            return;

        }

        // Get.
        node.getParam(param_name).then((paramValue) => {

            rosnodejs.log.debug('(reload_parameter): Loading parameter ' + param_name);

            // (Re)set value -- keeping an object because we may want to store other stuff with the value,
            // eventually -- also, compatibility with the prior version of the lib.
            ros_lib.parameters[param_name] = {
                'value': paramValue
            };

            // Call callback, if any.
            if (callback) {
                callback(param_name);
            }

        });

    });

};

/**
 * Inform parameter server of change
 * 
 * @param {string} param_name - Name of the ROS parameter.
 * @param {object} val - Value.
 */
ros_lib.set_parameter = function (param_name, val,  timestamp) {

    // Node not initialized.
    if (!(node)) {
        rosnodejs.log.warn('(set_parameter): Node has not yet been initialized.');
        return;
    }

    // Check; set.
    node.hasParam(param_name).then((exists) => {

        // Parameter doesn't exist in ROS.
        if (!exists) {
            rosnodejs.log.warn('(set_parameter): Parameter ' + param_name + ' is not in ROS definitions');
            return;
        }

        // Set.
        node.setParam(param_name, val);

        // Change value locally, if the parameter is stored locally.
        if (ros_lib.parameters[param_name]) {
            ros_lib.parameters[param_name].value = val;
            rosnodejs.log.debug('(set_parameter): Set parameter ' + param_name + ' to ' + JSON.stringify(val));
        }

        // Publish parameter change.
        var message = new ros_lib.msgs.hive_msgs.Hve_Updated_Params();
        message.header.stamp = timestamp || rosnodejs.Time.now();
        message.parameters = [param_name];

        setTimeout(function () {

            ros_lib.publish('/hive_conf/updated_parameters', message);

        }, 500);

    });

};

/**
 * Configure parameter in local reference and inform change 
 * 
 * @param {string} param_name - Name of the ROS parameter.
 * @param {object} val - Value.
 */
ros_lib.configure_parameter = function (param_name, val) {

    // Node not initialized.
    if (!(node)) {
        rosnodejs.log.warn('(set_parameter): Node has not yet been initialized.');
        return;
    }

    // Check; set.
    node.hasParam(param_name).then((exists) => {

        // Parameter doesn't exist in ROS.
        if (!exists) {
            rosnodejs.log.warn('(set_parameter): Parameter ' + param_name + ' is not in ROS definitions');
            return;
        }

        // Publish parameter change. Hve_Conf_Param
        var message          = new ros_lib.msgs.hive_msgs.Hve_Updated_Params();
    	var p                = new ros_lib.msgs.hive_msgs.Hve_Conf_Param();
    	p.full_parameter_path= param_name;
    	p.parameter_value    = val;
    	message.parameters.push(p);
        message.header.stamp = rosnodejs.Time.now();

        setTimeout(function () {

            ros_lib.publish('/hive_conf/configure_parameters', message);

        }, 500);

    });
}

/**
 * Add action to ROS library.
 * 
 * @param {string} action_server - Name of the action server.
 * @param {string} action_name - Name of the ROS action.
 * @param {array} callbacks - Action callbacks.
 */
ros_lib.add_action = function (action_server, action_name, callbacks) {

    // Node has already been initialized.
    if (node) {
        rosnodejs.log.warn('(add_action): Node has already been initialized; no more adding of actions.');
        return;
    }

    // Create action_server namespace, if it doesn't already exist.
    if (actions[action_server]) {
        // Do nothing.
    } else {
        actions[action_server] = {};
    }

    // Duplicate action.
    if (actions[action_server][action_name]) {
        rosnodejs.log.debug('(add_action): $ROS trying to add duplicate action: ' + action_name);
    }

    // Add.
    actions[action_server][action_name] = {
        'callbacks': callbacks
    };

};

/**
 * Execute an action on ROS library.
 * 
 * @param {string} action_server - Name of the action server.
 * @param {string} action_name - Name of the ROS action.
 * @param {string} action_command - Name of the ROS action command.
 * @param {string} action_payload - Action payload.
 */
ros_lib.act = function (action_server, action_name, action_command, action_payload) {

    // Is the action_server valid?
    if (actions[action_server]) {
        // Do nothing.
    } else {
        rosnodejs.log.warn('(act): $ROS trying to call invalid action server: ' + action_server);
        return false;
    }

    // is the action_name valid?
    if (actions[action_server][action_name]) {
        // Do nothing.
    } else {
        rosnodejs.log.warn('(act): $ROS trying to call invalid action name: ' + action_server + ' => ' + action_name);
        return false;
    }

    // Commands.
    switch (action_command) {
        case "send":
            actions[action_server][action_name].client.sendGoal(action_payload);
            rosnodejs.log.debug('  Action client sent a goal');
            break;

        case "cancel":
            actions[action_server][action_name].client.cancel();
            rosnodejs.log.debug('  Action client sent a cancellation');
            break;

        case "shutdown":
            actions[action_server][action_name].client.shutdown();
            rosnodejs.log.debug('  Action client sent a shut-down');
            break;

        default:
            rosnodejs.log.debug('(act): $ROS trying to call invalid command on action: ' + action_server + ' => ' + action_name);
            return false;
    }

};

/**
 * Add service to ROS library.
 * 
 * @param {string} service_type - This should be only requests or replies.
 * @param {string} service_name - Name of the ROS service to be requested.
 * @param {string} msg_type - Type of the ROS message.
 * @param {boolean} timeout - Service timeout
 */
ros_lib.add_service = function (service_type, service_name, msg_type, timeout=1000) {

    // Node has already been initialized.
    if (node) {
        rosnodejs.log.warn('(add_service_request): Node has already been initialized; no more adding services.');
        return;
    }
    
    // Add to service to list of handlers
    services['requests'][service_name] = {
        'msg_type': msg_type,
        'timeout':timeout,
    };
};


/**
 * Calls for service client to request to ROS library.
 * 
 * @param {string} service_name - Name of the ROS service to be requested.
 * @param {string} request_payload - a valid request payload for ROS service
 * @param {function} callback - Response callback.
 */
ros_lib.request = function (service_name, request_payload, callback) {

	if (! services.requests.hasOwnProperty(service_name)){
		rosnodejs.log.warn('Request client ['+service_name+'] does not exists');
		return;
	}
		
	if ( services.requests[service_name].client === undefined ){
		rosnodejs.log.warn('ROS request client for ['+service_name+'] do not exist');
		return;
	}
	
	//TODO: What happens if we will send undefined payload?
	
	// We are going to call the service name
	var promise = services.requests[service_name].client.call(request_payload);
	
	// We can not guarantee that the reply server will  
	//   be available so we handle an invalid promise
	//	 reply with ROS format (statusMessage and code).
	promise.then((resp) => { 
		// Calling defined callback
		callback(resp);
	})
	.catch(e => {
		if (e.statusMessage){
			rosnodejs.log.warn('  Request failed to receive reply, error ('+e.code+'): '+e.statusMessage);	
		}
		else{
			
			// Service will not return invalid option but fail
			//	the request. The failed request should still
			//	call the callback but without response. This
			//	should be coded and catched inside the callback.
			rosnodejs.log.warn('  Request failed: '+e.stack );
			callback();
		}
	});
	
}

/**
 * Add publisher to ROS library.
 * 
 * @param {string} topic_name - Name of the ROS topic.
 * @param {string} msg_type - Type of the ROS message.
 * @param {boolean} is_latched - Is it latched?
 */
ros_lib.add_publisher = function (topic_name, msg_type, is_latched = true) {

    // Node has already been initialized.
    if (node) {
        rosnodejs.log.warn('(add_publisher): Node has already been initialized; no more adding publishers.');
        return;
    }

    // Add to publishers.
    publishers[topic_name] = {
        'msg_type': msg_type,
        'is_latched': is_latched
    };

};

/**
 * Publish on ROS library.
 * 
 * @param {string} topic_name - Name of the ROS topic.
 * @param {object} message_properties - Message properties.
 */
ros_lib.publish = function (topic_name, message_properties) {

    // is the topic valid?
    if (publishers[topic_name] && publishers[topic_name].publisher) {
        // Do nothing.
    } else {
        rosnodejs.log.warn('$ROS trying to publish to invalid topic: ' + topic_name);
        return false;
    }

    // Create ROS message.
    var _ros_message = new publishers[topic_name].msg_type();

    // Checking if has a time stamp.
    if ('header' in _ros_message) {
        _ros_message.header.stamp = rosnodejs.Time.now();
    }

    // Add properties.
    for (var _prop in message_properties) {
        _ros_message[_prop] = message_properties[_prop];
    }

    // Publish message.
    publishers[topic_name].publisher.publish(_ros_message);

};

/**
 * Add subscriber to ROS library.
 * 
 * @param {string} topic_name - Name of the ROS topic.
 * @param {string} msg_type - Type of the ROS message.
 * @param {function} callback - Callback.
 */
ros_lib.add_subscriber = function (topic_name, msg_type, callback) {

    // Mode has already been initialized.
    if (node) {
        rosnodejs.log('(add_subscriber): Node has already been initialized; no more adding subscribers.');
        return;
    }

    // Add to subscribers -- but wrap callback in a function that checks "subscribers_inactive".
    subscribers[topic_name] = {
        'msg_type': msg_type,
        'callback_raw': callback,
        'callback': function (M) {
            if (subscribers_inactive) {
                // Save.
                last_messages_received_while_subscribers_inactive[topic_name] = M;
            } else {
                // Execute.
                subscribers[topic_name].callback_raw.call(this, M);
            }
        }
    };

};

/**
 * Execute last messages received while subscribers were inactive.
 */
ros_lib.execute_last_messages_received_while_subscribers_inactive = function () {

    for (var _topic_name in last_messages_received_while_subscribers_inactive) {

        // Execute.
        rosnodejs.log.debug('Executing saved message: ' + _topic_name);
        subscribers[_topic_name].callback_raw.call(this, last_messages_received_while_subscribers_inactive[_topic_name]);

        // Delete.
        delete last_messages_received_while_subscribers_inactive[_topic_name];

    }

};

/**
 * Add logger to ROS library.
 * 
 * @param {string} logger - Logger.
 */
ros_lib.add_logger = function (logger) {

    // Loggging.
    const ros_logger = rosnodejs.log.getLogger('ros');
    ros_logger.addStream(logger);

};

/**
 * Set logger level.
 * 
 * @param {string} logger_level - Logger level.
 */
ros_lib.set_level = function (logger_level) {

    var ros_logger = rosnodejs.log.getLogger('ros');
    var curr_logger_level = ros_logger.getLevel();

    rosnodejs.log.debug('(set_level): Setting from ' + curr_logger_level + ' to ' + logger_level);
    ros_logger.setLevel(logger_level);

};

/**
 * Get ROS timestamp.
 */
ros_lib.time_stamp = function () {
    return rosnodejs.Time.now();
};

ros_lib.nodejs = rosnodejs; // TODO: This should be removed

module.exports = ros_lib;

/*
 * Relevant docs:
 * ==============
 *
 * latching: Enable 'latching' on the connection. When a connection is 
 * latched, the last message published is saved and sent to any future 
 * subscribers that connect. False by default. 
 * 
 * tcpNoDelay: Sets noDelay on the publisher's socket. False by default. 
 * 
 * queueSize: This determines the size of the outgoing message queue for 
 * this publisher. Consecutive calls to publish will add new messages to 
 * the queue up to queueSize, at which point older messages will be dropped 
 * off. Interacts with throttleMs below. Default is 1. 
 * 
 * throttleMs: This determines the minimum interval at which this 
 * publisher's outgoing message queue will be handled. When calls to 
 * publish are made, the message is placed onto a queue and a timeout is 
 * set with throttleMs - when that timeout expires, all the messages that have 
 * made it into your queue (as determined by queueSize) will be sent. If 
 * throttleMs is negative, any call to publish will be handled immediately 
 * without being sent to the back of the event loop. Default is 0. 
 */