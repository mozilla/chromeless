import os
import sys
import time
import tempfile
import atexit
import shutil

import simplejson as json
import mozrunner
from cuddlefish.prefs import DEFAULT_FIREFOX_PREFS
from cuddlefish.prefs import DEFAULT_THUNDERBIRD_PREFS

def install_xpts(harness_root_dir, xpts):
    """
    Temporarily 'installs' all given XPCOM typelib files into the
    harness components directory.

    This is needed because there doesn't seem to be any way to
    install typelibs during the runtime of a XULRunner app.
    """

    my_components_dir = os.path.join(harness_root_dir, 'components')
    installed_xpts = []
    for abspath in xpts:
        target = os.path.join(my_components_dir,
                              os.path.basename(abspath))
        shutil.copyfile(abspath, target)
        installed_xpts.append(target)

    @atexit.register
    def cleanup_installed_xpts():
        for path in installed_xpts:
            os.remove(path)

def follow_file(filename):
    """
    Generator that yields the latest unread content from the given
    file, or None if no new content is available.

    For example:

      >>> f = open('temp.txt', 'w')
      >>> f.write('hello')
      >>> f.flush()
      >>> tail = follow_file('temp.txt')
      >>> tail.next()
      'hello'
      >>> tail.next() is None
      True
      >>> f.write('there')
      >>> f.flush()
      >>> tail.next()
      'there'
      >>> f.close()
      >>> os.remove('temp.txt')
    """

    last_pos = 0
    last_size = 0
    while True:
        newstuff = None
        if os.path.exists(filename):
            size = os.stat(filename).st_size
            if size > last_size:
                last_size = size
                f = open(filename, 'r')
                f.seek(last_pos)
                newstuff = f.read()
                last_pos = f.tell()
                f.close()
        yield newstuff

class FennecProfile(mozrunner.Profile):
    preferences = {}

    names = ['fennec']

class FennecRunner(mozrunner.Runner):
    profile_class = FennecProfile

    names = ['fennec']

    __DARWIN_PATH = '/Applications/Fennec.app/Contents/MacOS/fennec'

    def __init__(self, binary=None, **kwargs):
        if sys.platform == 'darwin' and binary and binary.endswith('.app'):
            # Assume it's a Fennec app dir.
            binary = os.path.join(binary, 'Contents/MacOS/fennec')

        self.__real_binary = binary

        mozrunner.Runner.__init__(self, **kwargs)

    def find_binary(self):
        if not self.__real_binary:
            if sys.platform == 'darwin':
                if os.path.exists(self.__DARWIN_PATH):
                    return self.__DARWIN_PATH
            self.__real_binary = mozrunner.Runner.find_binary(self)
        return self.__real_binary

class XulrunnerAppProfile(mozrunner.Profile):
    preferences = {'browser.dom.window.dump.enabled': True,
                   'javascript.options.strict': True}

    names = []

class XulrunnerAppRunner(mozrunner.Runner):
    """
    Runner for any XULRunner app. Can use a Firefox binary in XULRunner
    mode to execute the app, or can use XULRunner itself. Expects the
    app's application.ini to be passed in as one of the items in
    'cmdargs' in the constructor.

    This class relies a lot on the particulars of mozrunner.Runner's
    implementation, and does some unfortunate acrobatics to get around
    some of the class' limitations/assumptions.
    """

    profile_class = XulrunnerAppProfile

    # This is a default, and will be overridden in the instance if
    # Firefox is used in XULRunner mode.
    names = ['xulrunner']

    def __init__(self, binary=None, **kwargs):
        if sys.platform == 'darwin' and binary and binary.endswith('.app'):
            # Assume it's a Firefox app dir.
            binary = os.path.join(binary, 'Contents/MacOS/firefox-bin')

        self.__app_ini = None
        self.__real_binary = binary

        mozrunner.Runner.__init__(self, **kwargs)

        # See if we're using a genuine xulrunner-bin from the XULRunner SDK,
        # or if we're being asked to use Firefox in XULRunner mode.
        self.__is_xulrunner_sdk = 'xulrunner' in self.binary

        if sys.platform == 'linux2' and not self.env.get('LD_LIBRARY_PATH'):
            self.env['LD_LIBRARY_PATH'] = os.path.dirname(self.binary)

        newargs = []
        for item in self.cmdargs:
            if 'application.ini' in item:
                self.__app_ini = item
            else:
                newargs.append(item)
        self.cmdargs = newargs

        if not self.__app_ini:
            raise ValueError('application.ini not found in cmdargs')
        if not os.path.exists(self.__app_ini):
            raise ValueError("file does not exist: '%s'" % self.__app_ini)

    @property
    def command(self):
        """Returns the command list to run."""

        if self.__is_xulrunner_sdk:
            return [self.binary, self.__app_ini, '-profile',
                    self.profile.profile]
        else:
            return [self.binary, '-app', self.__app_ini, '-profile',
                    self.profile.profile]

    def find_binary(self):
        # This gets called by the superclass constructor. It will
        # always get called, even if a binary was passed into the
        # constructor, because we want to have full control over
        # what the exact setting of self.binary is.

        if not self.__real_binary:
            dummy_profile = {}
            runner = mozrunner.FirefoxRunner(profile=dummy_profile)
            self.__real_binary = runner.find_binary()
            self.names = runner.names
        return self.__real_binary

def run_app(harness_root_dir, harness_options, xpts,
            app_type, binary=None, profiledir=None, verbose=False,
            timeout=None, logfile=None):
    if binary:
        binary = os.path.expanduser(binary)

    addons = []
    cmdargs = []
    preferences = {}

    if app_type == "xulrunner":
        profile_class = XulrunnerAppProfile
        runner_class = XulrunnerAppRunner
        cmdargs.append(os.path.join(harness_root_dir, 'application.ini'))
    else:
        addons.append(harness_root_dir)
        if app_type == "firefox":
            profile_class = mozrunner.FirefoxProfile
            preferences = DEFAULT_FIREFOX_PREFS
            runner_class = mozrunner.FirefoxRunner
        elif app_type == "thunderbird":
            profile_class = mozrunner.ThunderbirdProfile
            preferences = DEFAULT_THUNDERBIRD_PREFS
            runner_class = mozrunner.ThunderbirdRunner
        elif app_type == "fennec":
            profile_class = FennecProfile
            runner_class = FennecRunner
        else:
            raise ValueError("Unknown app: %s" % app_type)
        if sys.platform == 'darwin':
            cmdargs.append('-foreground')

    resultfile = os.path.join(tempfile.gettempdir(), 'harness_result')
    if os.path.exists(resultfile):
        os.remove(resultfile)
    harness_options['resultFile'] = resultfile

    def maybe_remove_logfile():
        if os.path.exists(logfile):
            os.remove(logfile)

    logfile_tail = None

    if sys.platform in ['win32', 'cygwin']:
        if not logfile:
            # If we're on Windows, we need to keep a logfile simply
            # to print console output to stdout.
            logfile = os.path.join(tempfile.gettempdir(), 'harness_log')
        logfile_tail = follow_file(logfile)
        atexit.register(maybe_remove_logfile)

    if logfile:
        logfile = os.path.abspath(os.path.expanduser(logfile))
        maybe_remove_logfile()
        harness_options['logFile'] = logfile

    install_xpts(harness_root_dir, xpts)

    env = {}
    env.update(os.environ)
    env['MOZ_NO_REMOTE'] = '1'
    env['HARNESS_OPTIONS'] = json.dumps(harness_options)

    starttime = time.time()

    popen_kwargs = {}
    profile = None
    create_new = profiledir is None

    profile = profile_class(addons=addons,
                            profile=profiledir,
                            create_new=create_new,
                            preferences=preferences)
    runner = runner_class(profile=profile,
                          binary=binary,
                          env=env,
                          cmdargs=cmdargs,
                          kp_kwargs=popen_kwargs)
    runner.start()

    done = False
    output = None
    try:
        while not done:
            time.sleep(0.05)
            if logfile_tail:
                new_chars = logfile_tail.next()
                if new_chars:
                    sys.stdout.write(new_chars)
                    sys.stdout.flush()
            if os.path.exists(resultfile):
                output = open(resultfile).read()
                if output in ['OK', 'FAIL']:
                    done = True
            if timeout and (time.time() - starttime > timeout):
                raise Exception("Wait timeout exceeded (%ds)" %
                                timeout)
    except:
        runner.stop()
        raise
    else:
        runner.wait(10)
    finally:
        if profile:
            profile.cleanup()

    print "Total time: %f seconds" % (time.time() - starttime)

    if output == 'OK':
        print "Program terminated successfully."
        return 0
    else:
        print "Program terminated unsuccessfully."
        return -1
