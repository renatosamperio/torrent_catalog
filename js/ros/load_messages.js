module.exports = function ($ROS) {

    $ROS.msgs.std_msgs       = $ROS.nodejs.require('std_msgs').msg;
    $ROS.msgs.torrent_search = $ROS.nodejs.require('torrent_search').msg;
};