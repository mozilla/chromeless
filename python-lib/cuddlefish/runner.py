import os
import sys
import time
import tempfile
import atexit
import shutil

import simplejson as json
import mozrunner
from mozrunner import killableprocess
from cuddlefish.prefs import DEFAULT_FIREFOX_PREFS
from cuddlefish.prefs import DEFAULT_THUNDERBIRD_PREFS

def find_firefox_binary():
    dummy_profile = {}
    runner = mozrunner.FirefoxRunner(profile=dummy_profile)
    return runner.find_binary()

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

def run_app(harness_root_dir, harness_options, xpts,
            app_type, binary=None, profiledir=None, verbose=False,
            timeout=None, logfile=None):
    if binary:
        binary = os.path.expanduser(binary)
    if app_type == "xulrunner":
        if not binary:
            binary = find_firefox_binary()
    else:
        if app_type == "firefox":
            profile_class = mozrunner.FirefoxProfile
            preferences = DEFAULT_FIREFOX_PREFS
            runner_class = mozrunner.FirefoxRunner
        elif app_type == "thunderbird":
            profile_class = mozrunner.ThunderbirdProfile
            preferences = DEFAULT_THUNDERBIRD_PREFS
            runner_class = mozrunner.ThunderbirdRunner
        else:
            raise ValueError("Unknown app: %s" % app_type)

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

    if app_type == "xulrunner":
        # TODO: We're reduplicating a lot of mozrunner logic here,
        # we should probably just get mozrunner to support this
        # use case.

        if profiledir:
            xulrunner_profile = profiledir
        else:
            xulrunner_profile = tempfile.mkdtemp(suffix='.harness')
            @atexit.register
            def remove_xulrunner_profile():
                try:
                    shutil.rmtree(xulrunner_profile)
                except OSError:
                    pass

        cmdline = [binary,
                   '-app',
                   os.path.join(harness_root_dir, 'application.ini'),
                   '-profile', xulrunner_profile]

        if "xulrunner-bin" in binary:
            cmdline.remove("-app")

        if sys.platform == 'linux2' and not env.get('LD_LIBRARY_PATH'):
            env['LD_LIBRARY_PATH'] = os.path.dirname(binary)

        popen = killableprocess.Popen(cmdline, env=env, **popen_kwargs)
    else:
        plugins = [harness_root_dir]
        create_new = profiledir is None
        profile = profile_class(plugins=plugins,
                                profile=profiledir,
                                create_new=create_new,
                                preferences=preferences)
        runner = runner_class(profile=profile,
                              binary=binary,
                              env=env,
                              kp_kwargs=popen_kwargs)
        runner.start()
        popen = runner.process_handler

    done = False
    output = None
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
            # TODO: Kill the child process.
            raise Exception("Wait timeout exceeded (%ds)" %
                            timeout)

    popen.wait(10)

    print "Total time: %f seconds" % (time.time() - starttime)

    if profile:
        profile.cleanup()

    if popen.poll() == 0 and output == 'OK':
        print "Program terminated successfully."
        return 0
    else:
        print "Program terminated unsuccessfully."
        return -1
