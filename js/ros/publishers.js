module.exports = function ($ROS) {
	$ROS.add_publisher('/galaxy_imdb/update_torrent', 
						$ROS.msgs.std_msgs.Int32, 
						false
	);
};