import os
import sys
import subprocess

def init(root_dir):
    interop_dir = os.path.join(root_dir, 'tests',
                               'interoperablejs-read-only')
    if not os.path.exists(interop_dir):
        print "CommonJS compliance test directory not found."
        print
        print "Attempting to retrieve it now via svn."
        print
        retval = subprocess.call(
            ['svn', 'checkout',
             'http://interoperablejs.googlecode.com/svn/trunk/',
             interop_dir]
            )
        if retval:
            sys.exit(1)
