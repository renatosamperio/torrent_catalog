module.exports = function ($ROS) {
	$ROS.add_publisher('/galaxy_imdb/update_torrent', 
						$ROS.msgs.std_msgs.Int32, 
						false
	);
	$ROS.add_publisher('/yts_finder/torrents_to_download', 
			$ROS.msgs.torrent_search.SelectedTorrent, 
			false
);
};