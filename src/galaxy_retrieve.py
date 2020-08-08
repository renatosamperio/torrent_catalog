#!/usr/bin/env python

import sys, os
import threading
import rospy
import datetime
import time
import json
import re
import logging

from optparse import OptionParser, OptionGroup
from pprint import pprint
from imdb import IMDb
from datetime import datetime

from hs_utils import imdb_handler
from hs_utils import similarity
from hs_utils import ros_node, logging_utils
from hs_utils import message_converter as mc
from hs_utils import json_message_converter as rj
from hs_utils.mongo_handler import MongoAccess
from hs_utils.title_info_parser import TitleInfoParser
from hs_utils.utilities import compare_dictionaries

#from events_msgs.msg import WeeklyEvents

class TorrentParser:
    def __init__(self, **kwargs):
        try:
            self.database           = None
            self.torrents_collection= None
            self.torrents_db        = None
            self.imdb_collection    = None
            self.imdb_db            = None
            self.imdb_handler       = None
            self.list_terms         = None
            self.title_info_parser  = None
            
            for key, value in kwargs.iteritems():
                if "database" == key:
                    self.database = value
                elif "torrents_collection" == key:
                    self.torrents_collection = value
                elif "imdb_collection" == key:
                    self.imdb_collection = value
                elif "latest_collection" == key:
                    self.latest_collection = value
                elif "list_terms" == key:
                    self.list_terms = value

            ## Creating DB handler
            self.torrents_db = MongoAccess()
            connected       = self.torrents_db.Connect(
                                                self.database, 
                                                self.torrents_collection)
            ## Checking if DB connection was successful
            if not connected:
                raise Exception('DB [%s.%s] not available'%
                              (self.database, self.torrents_collection))
            else:
                rospy.logdebug("Created DB handler in %s.%s"%
                              (self.database, self.torrents_collection))
                
            ## Creating DB handler
            self.imdb_db = MongoAccess()
            connected       = self.imdb_db.Connect(
                                                self.database, 
                                                self.imdb_collection)
            ## Checking if DB connection was successful
            if not connected:
                raise Exception('DB [%s.%s] not available'%
                              (self.database, self.imdb_collection))
            else:
                rospy.logdebug("Created DB handler in %s.%s"%
                              (self.database, self.imdb_collection))
            
            ## Creating DB handler
            self.latest_db = MongoAccess()
            connected       = self.latest_db.Connect(
                                                self.database, 
                                                self.latest_collection)
            ## Checking if DB connection was successful
            if not connected:
                raise Exception('DB [%s.%s] not available'%
                              (self.database, self.latest_collection))
            else:
                rospy.logdebug("Created DB handler in %s.%s"%
                              (self.database, self.latest_collection))
            
            ## creating imdb handler
            args = {
                'list_terms':self.list_terms,
                'imdb':      True
            }
            self.imdb_handler = imdb_handler.IMDbHandler(**args)
            rospy.logdebug("Created IMDb handler")
            rospy.loginfo("Created torrent parser")
            
            self.title_info_parser = TitleInfoParser()
            
            self.ia = IMDb()
            self.comparator = similarity.Similarity()
        except Exception as inst:
              ros_node.ParseException(inst)
    
    def close(self):
        try:
            self.torrents_db.debug = 0
            self.imdb_db.debug     = 0
            self.latest_db.debug   = 0
            self.torrents_db.Close()
            self.imdb_db.Close()
            self.latest_db.Close()
        except Exception as inst:
              ros_node.ParseException(inst)

    def get_torrent_info(self):
        try:
            posts = self.torrents_db.Find({'torrent_info' : {'$exists': 0}})
            if not posts: rospy.logwarn('Torrents not found')
            rospy.loginfo('  Retrieved [%d] records'%posts.count() )
            
            for idx, torrent in enumerate(posts):
                torrent_info = {}
                keywords     = []
                galaxy_id    = torrent['galaxy_id']
                imdb_code    = torrent['imdb_code']
                
                ## getting extra information from torrent title
                title        = torrent['title'].replace('.', ' ').strip()
                mopped       = self.imdb_handler.clean_sentence(title, keywords).strip(' -')
                
                ## Assigning cleaned up title as torrent info
                if not torrent_info and len(imdb_code)>0:
                    torrent_info = {'title': mopped}
                    rospy.logdebug("Assigning clean title to existing IMDB");

                ## apply filters to get torrent info from title
                torrent_info = self.title_info_parser.run(mopped)
                groups  = ''
                pattern = '(\d{4}[+\s]?)((\d{2})|$)'

                has_info= re.search(pattern, mopped, re.I)
                if has_info and False:
                    start,end = has_info.span()
                    groups    = mopped[start:end]
                    mopped    = mopped[:start]+ mopped[end:]
                    mopped    = mopped.strip(', ')
                    print "===", title
                    
                ## Adding torrent information
                if torrent_info:
                    ok = True
                    q = {'galaxy_id':   galaxy_id}
                    s = {'torrent_info':torrent_info}
                    ok = self.torrents_db.Update(condition=q, substitute=s, operator='$set')
                    if not ok: rospy.logwarn('Invalid DB update for [%s]'%galaxy_id)
                    
                #print result n = re.search(p, s2)
                print ("%3d %7s %10s \t %100s *** %s"%
                       (idx+1, galaxy_id, imdb_code, mopped, groups))
            # print max_
        except Exception as inst:
              ros_node.ParseException(inst)

    def search_extra_imdb(self, torrent, title):
        try:
        
            ## looking for title in an alternative IMDB API
            imdb_titles = self.ia.search_movie_advanced(title)
            
            ## check if we found something informaiton
            has_imdb = False
            for item in imdb_titles:
                imdb_title = item.data['title']
                imdb_code  = 'tt'+item.movieID
                
                ## scoring collected data and assign perfect match
                score = self.comparator.score(title, imdb_title)
                if score == 1:
                    rospy.logdebug ("Searching for imdb [%s]"%imdb_code)
                    dict_row = self.imdb_handler.get_info(imdb_code)
                    dict_row['last_updated'] = datetime.now()
                    
                    ## double check if something went wrong while updating DB
                    exists = self.imdb_db.Find({'imdb_id' : imdb_code})
                    if exists.count()<1:
                        result = self.imdb_db.Insert(dict_row)
                        if not result: rospy.logwarn('Invalid DB update for [%s]'%imdb_code)
                        else: rospy.loginfo("Inserted in imdb DB [%s]"%imdb_code)
                    else: 
                        rospy.logdebug("Item [%s] already exists in imdb DB"%imdb_code)
                    
                    torrent['imdb_code'] = imdb_code
                    has_imdb = True
                    break
                elif score > 0.98:
                    rospy.log('[%s] High similarity: [%s]'%(imdb_code, imdb_title))
                else:
                    rospy.log('[%s] Low similarity:  [%s]'%(imdb_code, imdb_title))

        except Exception as inst:
              ros_node.ParseException(inst)

    def look_existing_data(self):
        logging.getLogger('imdbpy.parser.http').setLevel(logging.getLevelName('DEBUG'))
        try:
            posts = self.torrents_db.Find(
                            { '$and': [
#                                {'torrent_info' : {'$exists': 1} },
                                {'reviewed' : {'$exists': 0} },    
                                {'imdb_code':      ""  }
                            ]}
                    )
            if not posts: rospy.logwarn('Torrents not found')
            total = posts.count()
            rospy.loginfo('  Retrieved [%d] records'%total )
            
            looked_titles = []
            skipped_titles = 0
            for idx, post in enumerate(posts):
                torrent = post.copy()
                galaxy_id    = torrent['galaxy_id']
                imdb_updated = torrent['imdb_updated']
                keywords     = []

                ## getting extra information from torrent title
                title        = torrent['title']
                group        = "***"
                torrent_info = {}

                ## torrent info has been already processed and it has
                ## an already cleaned title ready for an IMDB query
                if 'torrent_info' in torrent and torrent['torrent_info']:
                    torrent_info = torrent['torrent_info']
                    if 'title' not in torrent_info:
                        rospy.logwarn('No title found for [%s]'%galaxy_id)
                    
                    #title = torrent_info['title']
                    group = ""
                ## clean up raw torrent title when there is no 
                ## torrent info without IMDB code
                
                ## getting extra information from torrent title
                title = title.replace('.', ' ').strip()
                title = self.imdb_handler.clean_sentence(title, keywords).strip(' -')
                
                ## whenever there are keywords it means that they were
                ## taken from the title and the title has changed too,
                ## therefore we should update title in torrent info
                if len(keywords)>0: 
                    torrent_info.update({'keywords':keywords, 'title': title})
                
                ## apply filters to get torrent info from title
                rospy.logdebug('Parsing [%s]'%title)
                torrent_info = self.title_info_parser.run(title, torrent_info)
                if 'title' in torrent_info.keys() and torrent_info: 
                    title = torrent_info['title']
                    rospy.logdebug('Using refreshed title [%s]'%title)

            ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ##
            ## ##                         REMOVE THIS SECTION ??  
            ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ##
                ## do not update IMDB already existing torrents
                ## otherwise update IMDB information
                if title in looked_titles:
                    skipped_titles += 1
                    imdb_titles = []
                    rospy.logdebug('Item [%s - %s] has already been looked'%(galaxy_id, title))
                ## keeping track of looked items
                else: looked_titles.append(title)
            ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ##
                    
                ## looking for title in an alternative IMDB API
                imdb_titles = self.ia.search_movie_advanced(title)
                
                ## check if we found something informaiton
                has_imdb = False
                for item in imdb_titles:
                    imdb_title = item.data['title']
                    imdb_code  = 'tt'+item.movieID
                    
                    ## scoring collected data and assign perfect match
                    score = self.comparator.score(title, imdb_title)
                    if score == 1:
                        rospy.logdebug ("Searching for imdb [%s]"%imdb_code)
                        dict_row = self.imdb_handler.get_info(imdb_code)
                        dict_row['last_updated'] = datetime.now()
                        
                        ## double check if something went wrong while updating DB
                        exists = self.imdb_db.Find({'imdb_id' : imdb_code})
                        if exists.count()<1:
                            result = self.imdb_db.Insert(dict_row)
                            if not result: rospy.logwarn('Invalid DB update for [%s]'%imdb_code)
                            else: rospy.loginfo("Inserted in imdb DB [%s]"%imdb_code)
                        else: 
                            rospy.logdebug("Item [%s] already exists in imdb DB"%imdb_code)
                        
                        torrent['imdb_code'] = imdb_code
                        has_imdb = True
                        break
                    elif score > 0.98:
                        rospy.loginfo('[%s] High similarity: [%s]'%(imdb_code, imdb_title))
                    else:
                        rospy.loginfo('[%s] Low similarity:  [%s]'%(imdb_code, imdb_title))
                            
                
                rospy.loginfo ("(%d/%d) Got [%d] items for imdb [%s]"%
                                ((idx+1), total, len(imdb_titles), title))
                
                ## check if imdb info has been updated
                if has_imdb and not imdb_updated:
                    torrent['imdb_updated'] = datetime.now()
                    rospy.logdebug('[%s] has IMDB but it was not marked'%galaxy_id)

                ## adding torrent information
                if not torrent_info:
                    torrent['torrent_info'] = {"title": title}
                    rospy.loginfo('[%s] has invalid torrent information'%galaxy_id)
                else: 
                    torrent['torrent_info'] = torrent_info
                    rospy.logdebug('[%s] has new torrent info'%galaxy_id)

                ## decide manually to update DB record
                print '- - - - - torrent - - - - -'
                pprint(torrent)
                changes, summary = compare_dictionaries(
                    torrent, post, 
                    "torrent", "post", 
                    use_values=True)
                if len(changes)>0:
                    print ""
                    if len(summary['different'])>0:
                        print "DIFFERENT:"
                        for different in summary['different']:
                            print different
                    if len(summary['missing'])>0:
                        print "MISSING:"
                        for missing in summary['missing']:
                            print missing

                answer = raw_input("Do you want to update DB? ") or "y"
                if answer=='y':
                    torrent['reviewed'] = datetime.now()
                    query = {'galaxy_id':   galaxy_id}
                    ok = self.torrents_db.Update(
                        condition=query, 
                        substitute=torrent, 
                        upsertValue=True)
                    if not ok: rospy.logwarn('Invalid DB update for [%s]'%galaxy_id)
                    else: rospy.loginfo('[%s] has updated torrent data'%galaxy_id)
                elif answer=='n':
                    rospy.logdebug('[%s] not updated torrent in DB'%galaxy_id)
                print "-"*80
                #print ("%3d %10s \t %100s %s"%(idx+1, galaxy_id, title, group))
                
                #break
            
            ## tell how many were repeated
            rospy.logdebug('Skipped [%d] titles'%skipped_titles)

        except Exception as inst:
              ros_node.ParseException(inst)
 
class GalaxyRetrieve(ros_node.RosNode):
    def __init__(self, **kwargs):
        try:
            
            self.condition  = threading.Condition()
            self.list_terms = None
            
            ## Initialising parent class with all ROS stuff
            super(GalaxyRetrieve, self).__init__(**kwargs)
            
            ## Initialise node activites
            self.Init()
        except Exception as inst:
              ros_node.ParseException(inst)

    def Init(self):
        try:
            ## getting parameters
            self.list_terms = self.mapped_params['/galaxy_imdb/list_term'].param_value
            
            ## starting torrent parser
            args = {
                'database':           'galaxy',
                'latest_collection':  'latest',
                'torrents_collection':'torrents',
                'imdb_collection':    'imdb',
                'list_terms':         self.list_terms,
                'imdb':      True
            }                       
            self.parser = TorrentParser(**args)
            
            rospy.Timer(rospy.Duration(0.5), self.Run, oneshot=True)
        except Exception as inst:
              ros_node.ParseException(inst)
              
    def ShutdownCallback(self):
        try:
            rospy.logdebug('+ Shutdown: Closing torrent parser')
            if self.parser:
                self.parser.close()
                self.parser = None
        except Exception as inst:
              ros_node.ParseException(inst)
              
    def Run(self, event):
        ''' Run method '''
        try:
            rospy.logdebug('+ Starting run method')
            while not rospy.is_shutdown():
                
                #rospy.logdebug('Retrieving  torrents')
                #self.parser.get_torrent_info()
                
                rospy.logdebug('Querying  torrents')
                self.parser.look_existing_data()
                rospy.signal_shutdown("Finished")
            rospy.logdebug('+ Ended run method')
        except Exception as inst:
              ros_node.ParseException(inst)

if __name__ == '__main__':
    #logging.getLogger('imdbpie').setLevel(logging.getLevelName('DEBUG'))
    #logging.getLogger('imdbpy.parser.http').setLevel(logging.getLevelName('DEBUG'))
    
    usage       = "usage: %prog option1=string option2=bool"
    parser      = OptionParser(usage=usage)
    parser.add_option('--queue_size',
                type="int",
                action='store',
                default=1000,
                help='Topics to play')
    parser.add_option('--latch',
                action='store_true',
                default=False,
                help='Message latching')
    parser.add_option('--debug', '-d',
                action='store_true',
                default=False,
                help='Provide debug level')
    parser.add_option('--std_out', '-o',
                action='store_false',
                default=True,
                help='Allowing standard output')

    (options, args) = parser.parse_args()
    
    for k,v in  logging.Logger.manager.loggerDict.items():
        logging.getLogger(k).setLevel(logging.getLevelName('DEBUG'))
 
    args            = {}
    logLevel        = rospy.DEBUG if options.debug else rospy.INFO
    rospy.init_node('galaxy_retrieve', anonymous=False, log_level=logLevel)

    ## Defining static variables for subscribers and publishers
    sub_topics     = []
    pub_topics     = []
    system_params  = [
        '/galaxy_imdb/list_term',
    ]
    
    ## Defining arguments
    args.update({'queue_size':      options.queue_size})
    args.update({'latch':           options.latch})
    args.update({'sub_topics':      sub_topics})
    args.update({'pub_topics':      pub_topics})
    args.update({'allow_std_out':   options.std_out})
    args.update({'system_params':   system_params})
    
    # Go to class functions that do all the heavy lifting.
    try:
        spinner = GalaxyRetrieve(**args)
    except rospy.ROSInterruptException:
        pass
    # Allow ROS to go to all callbacks.
    rospy.spin()

