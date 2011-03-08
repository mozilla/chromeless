import sys
import os
import optparse
import glob
# new stuff
import platform
import appifier
import subprocess
import signal
import tempfile

from copy import copy
import simplejson as json
from cuddlefish import packaging
from cuddlefish.bunch import Bunch
#from cuddlefish.version import get_version

MOZRUNNER_BIN_NOT_FOUND = 'Mozrunner could not locate your binary'
MOZRUNNER_BIN_NOT_FOUND_HELP = """
I can't find the application binary in any of its default locations
on your system. Please specify one using the -b/--binary option.
"""

UPDATE_RDF_FILENAME = "%s.update.rdf"
XPI_FILENAME = "%s.xpi"

usage = """
%prog [options] command [command-specific options]

Supported Commands:
  docs       - view web-based documentation
  init       - create a sample addon in an empty directory
  test       - run tests
  run        - run program
  xpi        - generate an xpi

Experimental Commands:
  develop    - run development server

Internal Commands:
  sdocs      - export static documentation
  testcfx    - test the cfx tool
  testex     - test all example code
  testpkgs   - test all installed packages
  testall    - test whole environment

Experimental and internal commands and options are not supported and may be
changed or removed in the future.
"""

global_options = [
    (("-v", "--verbose",), dict(dest="verbose",
                                help="enable lots of output",
                                action="store_true",
                                default=False)),
    ]

parser_groups = (
    ("Supported Command-Specific Options", [
        (("", "--update-url",), dict(dest="update_url",
                                     help="update URL in install.rdf",
                                     metavar=None,
                                     default=None,
                                     cmds=['xpi'])),
        (("", "--update-link",), dict(dest="update_link",
                                      help="generate update.rdf",
                                      metavar=None,
                                      default=None,
                                      cmds=['xpi'])),
        (("-p", "--profiledir",), dict(dest="profiledir",
                                       help=("profile directory to pass to "
                                             "app"),
                                       metavar=None,
                                       default=None,
                                       cmds=['test', 'run', 'testex',
                                             'testpkgs', 'testall'])),
        (("-b", "--binary",), dict(dest="binary",
                                   help="path to app binary",
                                   metavar=None,
                                   default=None,
                                   cmds=['test', 'run', 'testex', 'testpkgs',
                                         'testall'])),
        (("-a", "--app",), dict(dest="app",
                                help=("app to run: firefox (default), "
                                      "xulrunner, fennec, or thunderbird"),
                                metavar=None,
                                default="firefox",
                                cmds=['test', 'run', 'testex', 'testpkgs',
                                      'testall'])),
        (("", "--dependencies",), dict(dest="dep_tests",
                                       help="include tests for all deps",
                                       action="store_true",
                                       default=False,
                                       cmds=['test', 'testex', 'testpkgs',
                                             'testall'])),
        (("", "--times",), dict(dest="iterations",
                                type="int",
                                help="number of times to run tests",
                                default=1,
                                cmds=['test', 'testex', 'testpkgs',
                                      'testall'])),
        (("-f", "--filter",), dict(dest="filter",
                                   help=("only run tests whose filenames "
                                         "match FILTER, a regexp"),
                                   metavar=None,
                                   default=None,
                                   cmds=['test', 'testex', 'testpkgs',
                                         'testall'])),
        (("-g", "--use-config",), dict(dest="config",
                                       help="use named config from local.json",
                                       metavar=None,
                                       default="default",
                                       cmds=['test', 'run', 'xpi', 'testex',
                                             'testpkgs', 'testall'])),
        (("", "--templatedir",), dict(dest="templatedir",
                                      help="XULRunner app/ext. template",
                                      metavar=None,
                                      default=None,
                                      cmds=['run', 'xpi'])),
        (("", "--extra-packages",), dict(dest="extra_packages",
                                         help=("extra packages to include, "
                                               "comma-separated. Default is "
                                               "'addon-kit'."),
                                         metavar=None,
                                         default="addon-kit",
                                         cmds=['run', 'xpi', 'test', 'testex',
                                               'testpkgs', 'testall',
                                               'testcfx'])),
        (("", "--pkgdir",), dict(dest="pkgdir",
                                 help=("package dir containing "
                                       "package.json; default is "
                                       "current directory"),
                                 metavar=None,
                                 default=None,
                                 cmds=['run', 'xpi', 'test'])),
        (("", "--static-args",), dict(dest="static_args",
                                      help="extra harness options as JSON",
                                      type="json",
                                      metavar=None,
                                      default="{}",
                                      cmds=['run', 'xpi'])),
        ]
     ),

    ("Experimental Command-Specific Options", [
        (("", "--use-server",), dict(dest="use_server",
                                     help="use development server",
                                     action="store_true",
                                     default=False,
                                     cmds=['run', 'test', 'testex', 'testpkgs',
                                           'testall'])),
        ]
     ),

    ("Internal Command-Specific Options", [
        (("", "--addons",), dict(dest="addons",
                                 help=("paths of addons to install, "
                                       "comma-separated"),
                                 metavar=None,
                                 default=None,
                                 cmds=['test', 'run', 'testex', 'testpkgs',
                                       'testall'])),
        (("", "--test-runner-pkg",), dict(dest="test_runner_pkg",
                                          help=("name of package "
                                                "containing test runner "
                                                "program (default is "
                                                "test-harness)"),
                                          default="test-harness",
                                          cmds=['test', 'testex', 'testpkgs',
                                                'testall'])),
        (("", "--keydir",), dict(dest="keydir",
                                 help=("directory holding private keys;"
                                       " default is ~/.jetpack/keys"),
                                 metavar=None,
                                 default=os.path.expanduser("~/.jetpack/keys"),
                                 cmds=['test', 'run', 'xpi', 'testex',
                                       'testpkgs', 'testall'])),
        (("", "--e10s",), dict(dest="enable_e10s",
                               help="enable out-of-process Jetpacks",
                               action="store_true",
                               default=False,
                               cmds=['test', 'run', 'testex', 'testpkgs'])),
        (("", "--logfile",), dict(dest="logfile",
                                  help="log console output to file",
                                  metavar=None,
                                  default=None,
                                  cmds=['run', 'test', 'testex', 'testpkgs'])),
        # TODO: This should default to true once our memory debugging
        # issues are resolved; see bug 592774.
        (("", "--profile-memory",), dict(dest="profileMemory",
                                         help=("profile memory usage "
                                               "(default is false)"),
                                         type="int",
                                         action="store",
                                         default=0,
                                         cmds=['test', 'testex', 'testpkgs',
                                               'testall'])),
        ]
     ),
    )

# Maximum time we'll wait for tests to finish, in seconds.
TEST_RUN_TIMEOUT = 5 * 60

def find_parent_package(cur_dir):
    tail = True
    while tail:
        if os.path.exists(os.path.join(cur_dir, 'package.json')):
            return cur_dir
        cur_dir, tail = os.path.split(cur_dir)
    return None

def check_json(option, opt, value):
    # We return the parsed JSON here; see bug 610816 for background on why.
    try:
        return json.loads(value)
    except ValueError:
        raise optparse.OptionValueError("Option %s must be JSON." % opt)

class CfxOption(optparse.Option):
    TYPES = optparse.Option.TYPES + ('json',)
    TYPE_CHECKER = copy(optparse.Option.TYPE_CHECKER)
    TYPE_CHECKER['json'] = check_json

def parse_args(arguments, global_options, usage, parser_groups, defaults=None):
    parser = optparse.OptionParser(usage=usage.strip(), option_class=CfxOption)

    def name_cmp(a, b):
        # a[0]    = name sequence
        # a[0][0] = short name (possibly empty string)
        # a[0][1] = long name
        names = []
        for seq in (a, b):
            names.append(seq[0][0][1:] if seq[0][0] else seq[0][1][2:])
        return cmp(*names)

    global_options.sort(name_cmp)
    for names, opts in global_options:
        parser.add_option(*names, **opts)

    for group_name, options in parser_groups:
        group = optparse.OptionGroup(parser, group_name)
        options.sort(name_cmp)
        for names, opts in options:
            if 'cmds' in opts:
                cmds = opts['cmds']
                del opts['cmds']
                cmds.sort()
                if not 'help' in opts:
                    opts['help'] = ""
                opts['help'] += " (%s)" % ", ".join(cmds)
            group.add_option(*names, **opts)
        parser.add_option_group(group)

    if defaults:
        parser.set_defaults(**defaults)

    (options, args) = parser.parse_args(args=arguments)

    if not args:
        parser.print_help()
        parser.exit()

    return (options, args)

def test_all(env_root, defaults):
    fail = False

    print "Testing cfx..."
    result = test_cfx(env_root, defaults['verbose'])
    if result.failures or result.errors:
        fail = True

    try:
        test_all_examples(env_root, defaults)
    except SystemExit, e:
        fail = (e.code != 0) or fail

    try:
        test_all_packages(env_root, defaults)
    except SystemExit, e:
        fail = (e.code != 0) or fail

    if fail:
        print "Some tests were unsuccessful."
        sys.exit(1)
    print "All tests were successful. Ship it!"
    sys.exit(0)

def test_cfx(env_root, verbose):
    import cuddlefish.tests

    olddir = os.getcwd()
    os.chdir(env_root)
    retval = cuddlefish.tests.run(verbose)
    os.chdir(olddir)
    return retval

def test_all_examples(env_root, defaults):
    examples_dir = os.path.join(env_root, "tests")
    examples = [dirname for dirname in os.listdir(examples_dir)
                if os.path.isdir(os.path.join(examples_dir, dirname))]
    examples.sort()
    fail = False
    for dirname in examples:
        print "Testing %s..." % dirname
        try:
            import shutil 
            from string import Template

            test_script_for_app = os.path.join(examples_dir, dirname, "test-app.js")

            if os.path.exists(test_script_for_app): 
               print "tests.js exists in " + test_script_for_app
               output_test = os.path.join(env_root, "packages", "chromeless","tests","test-app.js")
               print "Will copy test-app.js to " + output_test
               #shutil.copy(test_script_for_app, output_test);
               #print "66666" + json.dumps(defaults["static_args"]["browser"]) 
 
               defaultBrowser = os.path.join(".", "tests" , dirname, "index.html")
               with open(test_script_for_app, 'r') as f:
                  test_content = f.read()
                  prefix_contents = 'var options = { "staticArgs": {quitWhenDone: true, "browser": "'+defaultBrowser+'" , "appBasePath": "'+env_root+'" } };' + "\n"

                  with open(output_test, 'w') as ff:
                     ff.write(prefix_contents)
                     ff.write(test_content)

               run(arguments=["test",
                              "--pkgdir",
                              "packages/chromeless"],
                   defaults=defaults,
                   env_root=env_root)
            else: 
               output_test = os.path.join(env_root, "packages", "chromeless","tests","test-app.js")
               if os.path.exists(output_test): 
                  os.remove(output_test)
            
        except SystemExit, e:
            fail = (e.code != 0) or fail

    if fail:
        sys.exit(-1)

def test_all_packages(env_root, defaults):
    deps = []
    target_cfg = Bunch(name = "testpkgs", dependencies = deps)
    pkg_cfg = packaging.build_config(env_root, target_cfg)
    for name in pkg_cfg.packages:
        if name != "testpkgs":
            deps.append(name)
    print "Testing all available packages: %s." % (", ".join(deps))
    run(arguments=["test", "--dependencies"],
        target_cfg=target_cfg,
        pkg_cfg=pkg_cfg,
        defaults=defaults)

def run_development_mode(env_root, defaults):
    pkgdir = os.path.join(env_root, 'packages', 'development-mode')
    app = defaults['app']

    from cuddlefish import server
    port = server.DEV_SERVER_PORT
    httpd = server.make_httpd(env_root, port=port)
    thread = server.threading.Thread(target=httpd.serve_forever)
    thread.setDaemon(True)
    thread.start()

    print "I am starting an instance of %s in development mode." % app
    print "From a separate shell, you can now run cfx commands with"
    print "'--use-server' as an option to send the cfx command to this"
    print "instance. All logging messages will appear below."

    os.environ['JETPACK_DEV_SERVER_PORT'] = str(port)
    options = {}
    options.update(defaults)
    run(["run", "--pkgdir", pkgdir],
        defaults=options, env_root=env_root)

def get_config_args(name, env_root):
    local_json = os.path.join(env_root, "local.json")
    if not (os.path.exists(local_json) and
            os.path.isfile(local_json)):
        if name == "default":
            return []
        else:
            print >>sys.stderr, "File does not exist: %s" % local_json
            sys.exit(1)
    local_json = packaging.load_json_file(local_json)
    if 'configs' not in local_json:
        print >>sys.stderr, "'configs' key not found in local.json."
        sys.exit(1)
    if name not in local_json.configs:
        if name == "default":
            return []
        else:
            print >>sys.stderr, "No config found for '%s'." % name
            sys.exit(1)
    config = local_json.configs[name]
    if type(config) != list:
        print >>sys.stderr, "Config for '%s' must be a list of strings." % name
        sys.exit(1)
    return config

def killProcessByName(name):
    for line in os.popen("ps xa"):
        fields = line.split()
        pid = fields[0]
        process = " ".join(fields[4:])

        if process.find(name) != -1:
            print "killing pid: %s" % pid
            os.kill(int(pid), signal.SIGHUP)
            break


def initializer(env_root, args, out=sys.stdout, err=sys.stderr):
    from templates import MAIN_JS, PACKAGE_JSON, README_DOC, MAIN_JS_DOC, TEST_MAIN_JS
    path = os.getcwd()
    addon = os.path.basename(path)
    # if more than one argument
    if len(args) > 1:
        print >>err, 'Too many arguments.'
        return 1
    # if current dir isn't empty
    if len(os.listdir(path)) > 0:
        print >>err, 'This command must be run in an empty directory.'
        return 1
    for d in ['lib','data','tests','docs']:
        os.mkdir(os.path.join(path,d))
        print >>out, '*', d, 'directory created'
    open('README.md','w').write(README_DOC % {'name':addon})
    print >>out, '* README.md written'
    open('package.json','w').write(PACKAGE_JSON % {'name':addon})
    print >>out, '* package.json written'
    open(os.path.join(path,'tests','test-main.js'),'w').write(TEST_MAIN_JS)
    print >>out, '* tests/test-main.js written'
    open(os.path.join(path,'lib','main.js'),'w').write(MAIN_JS)
    print >>out, '* lib/main.js written'
    open(os.path.join(path,'docs','main.md'),'w').write(MAIN_JS_DOC)
    print >>out, '* docs/main.md written'
    print >>out, '\nYour sample add-on is now ready.'
    print >>out, 'Do "cfx test" to test it and "cfx run" to try it.  Have fun!'
    return 0

def run(arguments=sys.argv[1:], target_cfg=None, pkg_cfg=None,
        defaults=None, env_root=os.environ.get('CUDDLEFISH_ROOT')):
    parser_kwargs = dict(arguments=arguments,
                         global_options=global_options,
                         parser_groups=parser_groups,
                         usage=usage,
                         defaults=defaults)

    (options, args) = parse_args(**parser_kwargs)

    config_args = get_config_args(options.config, env_root);
    
    # reparse configs with arguments from local.json
    if config_args:
        parser_kwargs['arguments'] += config_args
        (options, args) = parse_args(**parser_kwargs)

    command = args[0]

    if command == "init":
        initializer(env_root, args)
        return
    if command == "develop":
        run_development_mode(env_root, defaults=options.__dict__)
        return
    if command == "testpkgs":
        test_all_packages(env_root, defaults=options.__dict__)
        return
    elif command == "testex":
        test_all_examples(env_root, defaults=options.__dict__)
        return
    elif command == "testall":
        test_all(env_root, defaults=options.__dict__)
        return
    elif command == "testcfx":
        test_cfx(env_root, options.verbose)
        return
    elif command == "docs":
        import subprocess
        import time
        import cuddlefish.server

        print "One moment."
        popen = subprocess.Popen([sys.executable,
                                  cuddlefish.server.__file__,
                                  'daemonic'])
        # TODO: See if there's actually a way to block on
        # a particular event occurring, rather than this
        # relatively arbitrary/generous amount.
        time.sleep(cuddlefish.server.IDLE_WEBPAGE_TIMEOUT * 2)
        return
    elif command == "sdocs":
        import docgen
        import chromeless
        dirname = os.path.join(chromeless.Dirs().build_dir, "docs")
        docgen.generate_static_docs(env_root, dirname)
        print "Created docs in %s." % dirname
        return

    target_cfg_json = None
    if not target_cfg:
        if not options.pkgdir:
            options.pkgdir = find_parent_package(os.getcwd())
            if not options.pkgdir:
                print >>sys.stderr, ("cannot find 'package.json' in the"
                                     " current directory or any parent.")
                sys.exit(1)
        else:
            options.pkgdir = os.path.abspath(options.pkgdir)
        if not os.path.exists(os.path.join(options.pkgdir, 'package.json')):
            print >>sys.stderr, ("cannot find 'package.json' in"
                                 " %s." % options.pkgdir)
            sys.exit(1)

        target_cfg_json = os.path.join(options.pkgdir, 'package.json')
        target_cfg = packaging.get_config_in_dir(options.pkgdir)

    # At this point, we're either building an XPI or running Jetpack code in
    # a Mozilla application (which includes running tests).

    use_main = False
    timeout = None
    inherited_options = ['verbose', 'enable_e10s']

    if command == "xpi":
        use_main = True
    if command == "appify": 
        use_main = True
    elif command == "test":
        if 'tests' not in target_cfg:
            target_cfg['tests'] = []
        timeout = TEST_RUN_TIMEOUT
        inherited_options.extend(['iterations', 'filter', 'profileMemory'])
    elif command == "run":
        use_main = True
    else:
        print >>sys.stderr, "Unknown command: %s" % command
        print >>sys.stderr, "Try using '--help' for assistance."
        sys.exit(1)

    if use_main and 'main' not in target_cfg:
        # If the user supplies a template dir, then the main
        # program may be contained in the template.
        if not options.templatedir:
            print >>sys.stderr, "package.json does not have a 'main' entry."
            sys.exit(1)

    if not pkg_cfg:
        pkg_cfg = packaging.build_config(env_root, target_cfg)

    target = target_cfg.name

    # the harness_guid is used for an XPCOM class ID. We use the
    # JetpackID for the add-on ID and the XPCOM contract ID.
    if "harnessClassID" in target_cfg:
        # For the sake of non-bootstrapped extensions, we allow to specify the
        # classID of harness' XPCOM component in package.json. This makes it
        # possible to register the component using a static chrome.manifest file
        harness_guid = target_cfg["harnessClassID"]
    else:
        import uuid
        harness_guid = str(uuid.uuid4())

    # TODO: Consider keeping a cache of dynamic UUIDs, based
    # on absolute filesystem pathname, in the root directory
    # or something.
    if command in ('xpi', 'run', 'appify'):
        from cuddlefish.preflight import preflight_config
        if target_cfg_json:
            config_was_ok, modified = preflight_config(
                target_cfg,
                target_cfg_json,
                keydir=options.keydir,
                err_if_privkey_not_found=False
                )
            if not config_was_ok:
                if modified:
                    # we need to re-read package.json . The safest approach
                    # is to re-run the "cfx xpi"/"cfx run" command.
                    print >>sys.stderr, ("package.json modified: please re-run"
                                         " 'cfx %s'" % command)
                else:
                    print >>sys.stderr, ("package.json needs modification:"
                                         " please update it and then re-run"
                                         " 'cfx %s'" % command)
                sys.exit(1)
        # if we make it this far, we have a JID
    else:
        assert command == "test"

    if "id" in target_cfg:
        jid = target_cfg["id"]
        assert not jid.endswith("@jetpack")
        unique_prefix = '%s-' % jid # used for resource: URLs
    else:
        # The Jetpack ID is not required for cfx test, in which case we have to
        # make one up based on the GUID.
        if options.use_server:
            # The harness' contractID (hence also the jid and the harness_guid)
            # need to be static in the "development mode", so that bootstrap.js
            # can unload the previous version of the package being developed.
            harness_guid = '2974c5b5-b671-46f8-a4bb-63c6eca6261b'
        unique_prefix = '%s-' % target
        jid = harness_guid

    assert not jid.endswith("@jetpack")
    if (jid.startswith("jid0-") or jid.startswith("anonid0-")):
        bundle_id = jid + "@jetpack"
    # Don't append "@jetpack" to old-style IDs, as they should be exactly
    # as specified by the addon author so AMO and Firefox continue to treat
    # their addon bundles as representing the same addon (and also because
    # they may already have an @ sign in them, and there can be only one).
    else:
        bundle_id = jid

    # the resource: URL's prefix is treated too much like a DNS hostname
    unique_prefix = unique_prefix.lower()
    unique_prefix = unique_prefix.replace("@", "-at-")
    unique_prefix = unique_prefix.replace(".", "-dot-")

    targets = [target]
    if command == "test":
        targets.append(options.test_runner_pkg)

    if options.extra_packages:
        targets.extend(options.extra_packages.split(","))

    deps = packaging.get_deps_for_targets(pkg_cfg, targets)
    build = packaging.generate_build_for_target(
        pkg_cfg, target, deps,
        prefix=unique_prefix,  # used to create resource: URLs
        include_dep_tests=options.dep_tests
        )

    if 'resources' in build:
        resources = build.resources
        for name in resources:
            resources[name] = os.path.abspath(resources[name])

    harness_contract_id = ('@mozilla.org/harness-service;1?id=%s' % jid)
    harness_options = {
        'bootstrap': {
            'contractID': harness_contract_id,
            'classID': '{%s}' % harness_guid
            },
        'jetpackID': jid,
        'bundleID': bundle_id,
        'staticArgs': options.static_args,
        }

    harness_options.update(build)

    if command == "test":
        # This should be contained in the test runner package.
        harness_options['main'] = 'run-tests'
    else:
        harness_options['main'] = target_cfg.get('main')

    for option in inherited_options:
        harness_options[option] = getattr(options, option)

    harness_options['metadata'] = packaging.get_metadata(pkg_cfg, deps)

    #sdk_version = get_version(env_root)
    #harness_options['sdkVersion'] = sdk_version

    packaging.call_plugins(pkg_cfg, deps)

    retval = 0

    a = appifier.Appifier()

    if command == 'package':
       browser_code_path = json.loads(options.static_args)["browser"]
       a.output_xul_app(browser_code=browser_code_path,
                        harness_options=harness_options,
                        dev_mode=False)
    elif command == 'appify':
        browser_code_path = json.loads(options.static_args)["browser"]
        a.output_application(browser_code=browser_code_path,
                             harness_options=harness_options,
                             dev_mode=False)

    if options.templatedir:
        app_extension_dir = os.path.abspath(options.templatedir)
    else:
        mydir = os.path.dirname(os.path.abspath(__file__))
        if sys.platform == "darwin":
            # If we're on OS X, at least point into the XULRunner
            # app dir so we run as a proper app if using XULRunner.
            app_extension_dir = os.path.join(mydir, "Test App.app",
                                             "Contents", "Resources")
        else:
            app_extension_dir = os.path.join(mydir, "app-extension")

    if command == 'run': 

        browser_code_path = options.static_args["browser"]

        if options.profiledir:
            options.profiledir = os.path.expanduser(options.profiledir)
            options.profiledir = os.path.abspath(options.profiledir)

        if options.addons is not None:
            options.addons = options.addons.split(",")

        if (platform.system() == 'Darwin'):
            # because of the manner in which we run the application, we mus t use a
            # temporary file to enable console output
            [fd, tmppath] = tempfile.mkstemp()
            os.close(fd)

            print "__init__: tmppath" + tmppath;
            print "__init__: browser code path: " + browser_code_path
            print "And logging to '%s'" % tmppath

            harness_options['logFile'] = tmppath

            standalone_app_dir = a.output_application(browser_code=browser_code_path, harness_options=harness_options, dev_mode=True)
            print "opening '%s'" % standalone_app_dir

            tailProcess = None
            try:
		import subprocess
                tailProcess = subprocess.Popen(["tail", "-f", tmppath])
                retval = subprocess.call(["open", "-W", standalone_app_dir])
            except KeyboardInterrupt:
                print "got ^C, exiting..."
                killProcessByName(standalone_app_dir)
            finally:
                tailProcess.terminate()
                os.remove(tmppath)

    else:
        if options.use_server:
            from cuddlefish.server import run_app
        else:
            from cuddlefish.runner import run_app

        if options.profiledir:
            options.profiledir = os.path.expanduser(options.profiledir)
            options.profiledir = os.path.abspath(options.profiledir)

        if options.addons is not None:
            options.addons = options.addons.split(",")

        try:
            retval = run_app(harness_root_dir=app_extension_dir,
                             harness_options=harness_options,
                             app_type=options.app,
                             binary=options.binary,
                             profiledir=options.profiledir,
                             verbose=options.verbose,
                             timeout=timeout,
                             logfile=options.logfile,
                             addons=options.addons)
        except Exception, e:
            if str(e).startswith(MOZRUNNER_BIN_NOT_FOUND):
                print >>sys.stderr, MOZRUNNER_BIN_NOT_FOUND_HELP.strip()
                retval = -1
            else:
                raise

    sys.exit(retval)
