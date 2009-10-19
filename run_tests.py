import sys
import os

if __name__ == '__main__':
    mydir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(mydir, 'harness', 'python-modules'))

    import harness

    harness.run(resources={'app': mydir},
                rootPaths=["resource://app/lib/",
                           "resource://app/tests/"],
                loader="resource://app/lib/cuddlefish.js")
