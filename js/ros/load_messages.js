module.exports = function ($ROS) {

    $ROS.msgs.std_msgs = $ROS.nodejs.require('std_msgs').msg;
};