import sys
import os
import subprocess

mydir = os.path.dirname(os.path.abspath(__file__))
js_interop_dir = os.path.join(mydir, 'interoperablejs-read-only')
sys.path.insert(0, os.path.join(mydir, 'harness', 'python-modules'))

import harness

def setup():
    if not os.path.exists(js_interop_dir):
        print "CommonJS compliance test directory not found."
        print
        print "Attempting to retrieve it now via svn."
        print
        retval = subprocess.call(
            ['svn', 'checkout',
             'http://interoperablejs.googlecode.com/svn/trunk/',
             'interoperablejs-read-only']
            )
        if retval:
            sys.exit(1)

if __name__ == '__main__':
    harness.run(setup=setup,
                resources={'app': mydir,
                           'interoperablejs': js_interop_dir},
                rootPaths=["resource://app/lib/",
                           "resource://app/tests/"],
                loader="resource://app/lib/cuddlefish.js")
