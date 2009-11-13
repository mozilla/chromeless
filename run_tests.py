import sys
import os
import subprocess

import harness

def setup():
    if not os.path.exists('interoperablejs-read-only'):
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
                resources={'app': '.'},
                rootPaths=["resource://app/lib/",
                           "resource://app/tests/"],
                loader="resource://app/lib/cuddlefish.js")
