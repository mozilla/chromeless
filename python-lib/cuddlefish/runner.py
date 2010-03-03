import os
import sys
import time
import tempfile
import subprocess
import atexit
import shutil

import simplejson as json
import mozrunner
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

def run_app(harness_root_dir, harness_options, xpts,
            app_type, binary=None, verbose=False,
            no_quit=False, timeout=None):
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

    harness_options['noQuit'] = no_quit

    resultfile = os.path.join(tempfile.gettempdir(), 'harness_result')
    if os.path.exists(resultfile):
        os.remove(resultfile)
    harness_options['resultFile'] = resultfile

    install_xpts(harness_root_dir, xpts)

    env = {}
    env.update(os.environ)
    env['MOZ_NO_REMOTE'] = '1'
    env['HARNESS_OPTIONS'] = json.dumps(harness_options)

    starttime = time.time()

    popen_kwargs = {}

    if app_type == "xulrunner":
        # TODO: We're reduplicating a lot of mozrunner logic here,
        # we should probably just get mozrunner to support this
        # use case.

        xulrunner_profile = tempfile.mkdtemp(suffix='.harness')
        cmdline = [binary,
                   '-app',
                   os.path.join(harness_root_dir, 'application.ini'),
                   '-profile', xulrunner_profile,
                   # This ensures that dump() calls are visible
                   # in Windows.
                   '-console']

        @atexit.register
        def remove_xulrunner_profile():
            try:
                shutil.rmtree(xulrunner_profile)
            except OSError:
                pass

        if "xulrunner-bin" in binary:
            cmdline.remove("-app")

        if sys.platform == 'linux2' and not env.get('LD_LIBRARY_PATH'):
            env['LD_LIBRARY_PATH'] = os.path.dirname(binary)

        popen = subprocess.Popen(cmdline, env=env, **popen_kwargs)
    else:
        plugins = [harness_root_dir]
        profile = profile_class(plugins=plugins,
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
        if popen.poll() is not None:
            # Sometimes the child process will spawn yet another
            # child and terminate the parent, so look for the
            # result file.
            if popen.returncode != 0:
                done = True
            elif os.path.exists(resultfile):
                output = open(resultfile).read()
                if output in ['OK', 'FAIL']:
                    done = True
        if timeout and (time.time() - starttime > timeout):
            # TODO: Kill the child process.
            raise Exception("Wait timeout exceeded (%ds)" %
                            timeout)

    print "Total time: %f seconds" % (time.time() - starttime)

    if popen.returncode == 0 and output == 'OK':
        print "Program terminated successfully."
        return 0
    else:
        print "Program terminated unsuccessfully."
        return -1
