import os
import simplejson as json
from datetime import datetime

class AppInfo(object):
    def __init__(self, dir):
        app_info_path = os.path.join(dir, "appinfo.json")
        parsed_info = { }
        if os.path.isfile(app_info_path):
            with open(app_info_path, 'r') as f:
                parsed_info = json.loads(f.read())

        dt = datetime.now()
        timestamp = "%4d%02d%02d%02d%02d%02d" % (dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)

        app_info_spec  = {
            "name":    "My Chromeless App",
            "version": "0.1",
            "long_version": "0.1." + timestamp ,
            "resizable": "false",
            "initial_dimensions": {
                "width": 800,
                "height": 600
            }
        }
        for prop in app_info_spec.keys():
            self.__dict__[prop] = parsed_info[prop] if prop in parsed_info else app_info_spec[prop]
            # XXX: creation of default values for nested properties
            
