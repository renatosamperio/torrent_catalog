cmake_minimum_required(VERSION 3.0.2)
project(torrent_catalog)

## Find catkin macros and libraries
## if COMPONENTS list like find_package(catkin REQUIRED COMPONENTS xyz)
## is used, also find other catkin packages
find_package(catkin REQUIRED COMPONENTS
  std_msgs
)

###################################
## catkin specific configuration ##
###################################
catkin_package(
#  INCLUDE_DIRS include
#  LIBRARIES torrent_catalog
  CATKIN_DEPENDS std_msgs
#  DEPENDS system_lib
)

###########
## Build ##
###########

include_directories(
# include
# ${catkin_INCLUDE_DIRS}
)

#############
## Install ##
#############
install(DIRECTORY js/
        DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}/launch
        FILES_MATCHING PATTERN "*.js"
        PATTERN ".git" EXCLUDE)

