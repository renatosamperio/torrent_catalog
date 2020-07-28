module.exports = function ($CA, $ROS) {

    $ROS.bsyslog = require('bunyan-syslog'); // Reference to syslog of rosnodejs base library.
    $ROS.bunyan = require('bunyan'); // Reference to syslog of rosnodejs base library.
    
    // Setting arguments log level.
    let debug_level = ("--verbose" in $CA.args || "-verbose" in $CA.args || "-d" in $CA.args || "-v" in $CA.args ? 'debug' : 'info');
    $ROS.nodejs.log.getLogger('ros').setLevel(debug_level);

    // Logging.
    $ROS.add_logger({
        level: debug_level,
        type: 'raw',
        stream: $ROS.bsyslog.createBunyanStream({
            type: 'sys',
            facility: $ROS.bsyslog.local0,
            host: '127.0.0.1',
            port: 514
        })
    });

    // Defining log wrappers.
    $ROS.log = {
        'trace': $ROS.nodejs.log.trace,
        'debug': $ROS.nodejs.log.debug,
        'info': $ROS.nodejs.log.info,
        'warn': $ROS.nodejs.log.warn,
        'error': $ROS.nodejs.log.error,
    };

    // HC.log <= ROS.log
    $CA.log = $ROS.nodejs.log;   

};
