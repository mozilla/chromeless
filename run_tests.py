import sys
import os
import subprocess

if __name__ == '__main__':
    mydir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(mydir, 'harness', 'python-modules'))

    import harness

    js_interop_dir = os.path.join(mydir, 'interoperablejs-read-only')
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

    harness.run(resources={'app': mydir,
                           'interoperablejs': js_interop_dir},
                rootPaths=["resource://app/lib/",
                           "resource://app/tests/"],
                loader="resource://app/lib/cuddlefish.js")
