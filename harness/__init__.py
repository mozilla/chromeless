import sys
import os
import subprocess
import time
import optparse
import cStringIO as StringIO

mydir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(mydir, 'python-modules'))

import simplejson as json

class FirefoxBinaryFinder(object):
    """Finds the local Firefox binary, taken from MozRunner."""
    
    @property
    def names(self):
        if sys.platform == 'darwin':
            return ['firefox', 'minefield', 'shiretoko']
        if sys.platform == 'linux2':
            return ['firefox', 'mozilla-firefox', 'iceweasel']
        if os.name == 'nt' or sys.platform == 'cygwin':
            return ['firefox']

    def find_binary(self):
        """Finds the binary for self.names if one was not provided."""
        binary = None
        if sys.platform == 'linux2':
            for name in reversed(self.names):
                binary = findInPath(name)
        elif os.name == 'nt' or sys.platform == 'cygwin':
            for name in reversed(self.names):
                binary = findInPath(name)
                if binary is None:
                    for bin in [os.path.join(os.environ['ProgramFiles'], 
                                             'Mozilla Firefox', 'firefox.exe'),
                                os.path.join(os.environ['ProgramFiles'], 
                                             'Mozilla Firefox3', 'firefox.exe'),
                                ]:
                        if os.path.isfile(bin):
                            binary = bin
                            break
        elif sys.platform == 'darwin':
            for name in reversed(self.names):
                appdir = os.path.join('Applications', name.capitalize()+'.app')
                if os.path.isdir(os.path.join(os.path.expanduser('~/'), appdir)):
                    binary = os.path.join(os.path.expanduser('~/'), appdir, 
                                          'Contents/MacOS/'+name+'-bin')
                elif os.path.isdir('/'+appdir):
                    binary = os.path.join("/"+appdir, 'Contents/MacOS/'+name+'-bin')
                    
                if binary is not None:
                    if not os.path.isfile(binary):
                        binary = binary.replace(name+'-bin', 'firefox-bin')
                    if not os.path.isfile(binary):
                        binary = None
        if binary is None:
            raise Exception('Mozrunner could not locate your binary, '
                            'you will need to set it.')
        return binary

def run(**kwargs):
    parser_options = {
        ("-b", "--binary",): dict(dest="binary",
                                  help="Binary path.", 
                                  metavar=None,
                                  default=None),
        ("-v", "--verbose",): dict(dest="verbose",
                                   help="Enable lots of output.",
                                   action="store_true",
                                   default=False),
        }

    parser = optparse.OptionParser()
    for names, opts in parser_options.items():
        parser.add_option(*names, **opts)
    (options, args) = parser.parse_args()
    if not options.binary:
        options.binary = FirefoxBinaryFinder().find_binary()

    if 'setup' in kwargs:
        kwargs['setup']()
        del kwargs['setup']

    if 'resources' in kwargs:
        resources = kwargs['resources']
        for name in resources:
            resources[name] = os.path.abspath(resources[name])

    mydir = os.path.dirname(os.path.abspath(__file__))

    cmdline = [options.binary,
               '-app',
               os.path.join(mydir, 'application.ini')]

    if "xulrunner-bin" in options.binary:
        cmdline.remove("-app")

    harness_options = {}
    harness_options.update(kwargs)
    for option in parser.option_list[1:]:
        harness_options[option.dest] = getattr(options, option.dest)

    env = {}
    env.update(os.environ)
    env['HARNESS_OPTIONS'] = json.dumps(harness_options)

    starttime = time.time()
    popen = subprocess.Popen(cmdline,
                             env=env,
                             stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT)
    output = StringIO.StringIO()
    while True:
        chars = popen.stdout.read(10)
        if chars:
            output.write(chars)
            sys.stdout.write(chars)
        elif popen.poll() is not None:
            break

    print "Total time: %f seconds" % (time.time() - starttime)

    lines = output.getvalue().splitlines()
    if popen.returncode == 0 and lines[-1].strip() == 'OK':
        print "All tests succeeded."
        retval = 0
    else:
        print "Some tests failed."
        retval = -1
    sys.exit(retval)
