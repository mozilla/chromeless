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
        cmdline = ['svn', 'checkout',
                   'http://interoperablejs.googlecode.com/svn/trunk/',
                   interop_dir]
        try:
            retval = subprocess.call(cmdline)
        except OSError, e:
            print "Execution of '%s' failed: %s" % (
                " ".join(cmdline),
                e
                )
            retval = -1
        if retval:
            print ("Obtaining compliance tests failed; some tests "
                   "may not execute successfully.")
