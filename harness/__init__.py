import sys
import os
import subprocess
import time
import optparse
import cStringIO as StringIO

mydir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(mydir, 'python-modules'))

import simplejson as json

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
        ("-x", "--times",): dict(dest="iterations",
                                 help="# of times to run tests.",
                                 default=1),
        ("-c", "--components",): dict(dest="components",
                                      help=("Extra XPCOM component "
                                            "dir(s), comma-separated."),
                                      default=None),
        ("-b", "--binary",): dict(dest="binary",
                                  help="Binary path.", 
                                  metavar=None,
                                  default=None),
        ("-v", "--verbose",): dict(dest="verbose",
                                   help="Enable lots of output.",
                                   action="store_true",
                                   default=False),
        ("-a", "--app",): dict(dest="app",
                               help=("App to run: xulrunner, firefox, "
                                     "or thunderbird. Default is "
                                     "xulrunner."),
                               metavar=None,
                               default="xulrunner")
        }

    parser = optparse.OptionParser()
    for names, opts in parser_options.items():
        parser.add_option(*names, **opts)
    (options, args) = parser.parse_args()

    if options.app == "xulrunner":
        if not options.binary:
            options.binary = FirefoxBinaryFinder().find_binary()
    else:
        import mozrunner
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

    mydir = os.path.dirname(os.path.abspath(__file__))

    harness_options = {}
    harness_options.update(kwargs)
    for option in parser.option_list[1:]:
        harness_options[option.dest] = getattr(options, option.dest)

    env = {}
    env.update(os.environ)
    env['MOZ_NO_REMOTE'] = '1'
    env['HARNESS_OPTIONS'] = json.dumps(harness_options)

    starttime = time.time()

    popen_kwargs = dict(stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT)

    if options.app == "xulrunner":
        cmdline = [options.binary,
                   '-app',
                   os.path.join(mydir, 'application.ini')]

        if "xulrunner-bin" in options.binary:
            cmdline.remove("-app")

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
    if popen.returncode == 0 and lines and lines[-1].strip() == 'OK':
        print "All tests succeeded."
        retval = 0
    else:
        print "Some tests failed."
        retval = -1
    sys.exit(retval)
