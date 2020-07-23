
module.exports = function ($HC, $ROS, $GeoTransform, $MathHelper) {

    /**
     * Adds a subscriber to '/activity_map/activity_map_png', so that a heatmap activity can be signalled.
     * 
     * @param {string} topic - ROS topic.
     * @param {object} messageType - ROS message type.
     * @param {function} callback - The function to be executed.
     */
    $ROS.add_subscriber('/galaxy_search/ready', $ROS.msgs.std_msgs.Bool, function (M) {
    	$HC.log.info("Torrent crawling was finished: "+M.data);

    });
};