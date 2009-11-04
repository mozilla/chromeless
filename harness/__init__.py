import sys
import os
import subprocess
import time
import tempfile
import optparse
import cStringIO as StringIO

mydir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(mydir, 'python-modules'))

import simplejson as json
import mozrunner

# Maximum time we'll wait for tests to finish, in seconds.
MAX_WAIT_TIMEOUT = 5 * 60

# When launching a temporary new Firefox profile, use these preferences.
DEFAULT_FIREFOX_PREFS = {
    'browser.startup.homepage' : 'about:blank',
    'startup.homepage_welcome_url' : 'about:blank',
    }

# When launching a temporary new Thunderbird profile, use these preferences.
# Note that these were taken from:
# http://mxr.mozilla.org/comm-central/source/mail/test/mozmill/runtest.py
DEFAULT_THUNDERBIRD_PREFS = {
    # say yes to debug output via dump
    'browser.dom.window.dump.enabled': True,
    # say no to slow script warnings
    'dom.max_chrome_script_run_time': 200,
    'dom.max_script_run_time': 0,
    # disable extension stuffs
    'extensions.update.enabled'    : False,
    'extensions.update.notifyUser' : False,
    # do not ask about being the default mail client
    'mail.shell.checkDefaultClient': False,
    # disable non-gloda indexing daemons
    'mail.winsearch.enable': False,
    'mail.winsearch.firstRunDone': True,
    'mail.spotlight.enable': False,
    'mail.spotlight.firstRunDone': True,
    # disable address books for undisclosed reasons
    'ldap_2.servers.osx.position': 0,
    'ldap_2.servers.oe.position': 0,
    # disable the first use junk dialog
    'mailnews.ui.junk.firstuse': False,
    # other unknown voodoo
    # -- dummied up local accounts to stop the account wizard
    'mail.account.account1.server' :  "server1",
    'mail.account.account2.identities' :  "id1",
    'mail.account.account2.server' :  "server2",
    'mail.accountmanager.accounts' :  "account1,account2",
    'mail.accountmanager.defaultaccount' :  "account2",
    'mail.accountmanager.localfoldersserver' :  "server1",
    'mail.identity.id1.fullName' :  "Tinderbox",
    'mail.identity.id1.smtpServer' :  "smtp1",
    'mail.identity.id1.useremail' :  "tinderbox@invalid.com",
    'mail.identity.id1.valid' :  True,
    'mail.root.none-rel' :  "[ProfD]Mail",
    'mail.root.pop3-rel' :  "[ProfD]Mail",
    'mail.server.server1.directory-rel' :  "[ProfD]Mail/Local Folders",
    'mail.server.server1.hostname' :  "Local Folders",
    'mail.server.server1.name' :  "Local Folders",
    'mail.server.server1.type' :  "none",
    'mail.server.server1.userName' :  "nobody",
    'mail.server.server2.check_new_mail' :  False,
    'mail.server.server2.directory-rel' :  "[ProfD]Mail/tinderbox",
    'mail.server.server2.download_on_biff' :  True,
    'mail.server.server2.hostname' :  "tinderbox",
    'mail.server.server2.login_at_startup' :  False,
    'mail.server.server2.name' :  "tinderbox@invalid.com",
    'mail.server.server2.type' :  "pop3",
    'mail.server.server2.userName' :  "tinderbox",
    'mail.smtp.defaultserver' :  "smtp1",
    'mail.smtpserver.smtp1.hostname' :  "tinderbox",
    'mail.smtpserver.smtp1.username' :  "tinderbox",
    'mail.smtpservers' :  "smtp1",
    'mail.startup.enabledMailCheckOnce' :  True,
    'mailnews.start_page_override.mstone' :  "ignore",
    }

def find_firefox_binary():
    dummy_profile = {}
    runner = mozrunner.FirefoxRunner(profile=dummy_profile)
    return runner.find_binary()

def run(**kwargs):
    parser_options = {
        ("-x", "--times",): dict(dest="iterations",
                                 help="number of times to run tests",
                                 default=1),
        ("-c", "--components",): dict(dest="components",
                                      help=("extra XPCOM component "
                                            "dir(s), comma-separated"),
                                      default=None),
        ("-b", "--binary",): dict(dest="binary",
                                  help="path to app binary", 
                                  metavar=None,
                                  default=None),
        ("-v", "--verbose",): dict(dest="verbose",
                                   help="enable lots of output",
                                   action="store_true",
                                   default=False),
        ("-a", "--app",): dict(dest="app",
                               help=("app to run: xulrunner (default), "
                                     "firefox, or thunderbird"),
                               metavar=None,
                               default="xulrunner"),
        ("-m", "--main",): dict(dest="main",
                                help=("run a module with a main() "
                                      "export instead of tests"),
                                metavar=None,
                                default=None),
        }

    parser = optparse.OptionParser()
    for names, opts in parser_options.items():
        parser.add_option(*names, **opts)
    (options, args) = parser.parse_args()

    if options.app == "xulrunner":
        if not options.binary:
            options.binary = find_firefox_binary()
    else:
        if options.app == "firefox":
            profile_class = mozrunner.FirefoxProfile
            preferences = DEFAULT_FIREFOX_PREFS
            runner_class = mozrunner.FirefoxRunner
        elif options.app == "thunderbird":
            profile_class = mozrunner.ThunderbirdProfile
            preferences = DEFAULT_THUNDERBIRD_PREFS
            runner_class = mozrunner.ThunderbirdRunner
        else:
            print "Unknown app: %s" % options.app
            sys.exit(1)

    if 'setup' in kwargs:
        kwargs['setup']()
        del kwargs['setup']

    options.iterations = int(options.iterations)

    if not options.components:
        options.components = []
    else:
        options.components = options.components.split(",")

    if 'components' in kwargs:
        options.components.extend(kwargs['components'])
        del kwargs['components']

    options.components = [os.path.abspath(path)
                          for path in options.components]

    if 'resources' in kwargs:
        resources = kwargs['resources']
        for name in resources:
            resources[name] = os.path.abspath(resources[name])

    resultfile = os.path.join(tempfile.gettempdir(), 'harness_result')
    if os.path.exists(resultfile):
        os.remove(resultfile)

    mydir = os.path.dirname(os.path.abspath(__file__))

    harness_options = {'resultFile': resultfile}
    harness_options.update(kwargs)
    for option in parser.option_list[1:]:
        harness_options[option.dest] = getattr(options, option.dest)

    env = {}
    env.update(os.environ)
    env['MOZ_NO_REMOTE'] = '1'
    env['HARNESS_OPTIONS'] = json.dumps(harness_options)

    starttime = time.time()

    popen_kwargs = {}

    if options.app == "xulrunner":
        cmdline = [options.binary,
                   '-app',
                   os.path.join(mydir, 'application.ini')]

        if "xulrunner-bin" in options.binary:
            cmdline.remove("-app")

        if sys.platform == 'linux2' and not env.get('LD_LIBRARY_PATH'):
            env['LD_LIBRARY_PATH'] = os.path.dirname(options.binary)

        popen = subprocess.Popen(cmdline, env=env, **popen_kwargs)
    else:
        plugins = [mydir]
        profile = profile_class(plugins=plugins,
                                preferences=preferences)
        runner = runner_class(profile=profile,
                              binary=options.binary,
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
        if time.time() - starttime > MAX_WAIT_TIMEOUT:
            # TODO: Kill the child process.
            raise Exception("Wait timeout exceeded (%ds)" %
                            MAX_WAIT_TIMEOUT)

    print "Total time: %f seconds" % (time.time() - starttime)

    if popen.returncode == 0 and output == 'OK':
        print "All tests succeeded."
        retval = 0
    else:
        print "Some tests failed."
        retval = -1
    sys.exit(retval)
