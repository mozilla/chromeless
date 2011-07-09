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
import chromeless

from copy import copy
import simplejson as json
from cuddlefish.bunch import Bunch
#from cuddlefish.version import get_version

MOZRUNNER_BIN_NOT_FOUND = 'Mozrunner could not locate your binary'
MOZRUNNER_BIN_NOT_FOUND_HELP = """
I can't find the application binary in any of its default locations
on your system. Please specify one using the -b/--binary option.
"""

usage = """
%prog [options] command [command-specific options]

Supported Commands:
  test       - run tests
  run        - run program
  package    - generate a stanalone xulrunner app directory

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
                                       cmds=['test', 'run', 'testex',
                                             'testpkgs', 'testall'])),
        (("", "--extra-packages",), dict(dest="extra_packages",
                                         help=("extra packages to include, "
                                               "comma-separated. Default is "
                                               "'addon-kit'."),
                                         metavar=None,
                                         default="addon-kit",
                                         cmds=['run', 'test', 'testex',
                                               'testpkgs', 'testall',
                                               'testcfx'])),
        (("", "--pkgdir",), dict(dest="pkgdir",
                                 help=("package dir containing "
                                       "package.json; default is "
                                       "current directory"),
                                 metavar=None,
                                 default=None,
                                 cmds=['run', 'test'])),
        (("", "--static-args",), dict(dest="static_args",
                                      help="extra harness options as JSON",
                                      type="json",
                                      metavar=None,
                                      default="{}",
                                      cmds=['run'])),
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
                                 cmds=['test', 'run', 'testex',
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
        output_test = os.path.join(chromeless.Dirs().home_dir, "modules", "internal", "test_harness", "test-app.js")
        try:
            import shutil
            from string import Template

            test_script_for_app = os.path.join(examples_dir, dirname, "test-app.js")
            browserToLaunch = os.path.join(examples_dir, dirname, "index.html")

            if os.path.exists(test_script_for_app):
               print "Found test file for %s: %s" % (dirname, test_script_for_app)

               print "Will create test file in " + output_test

               defaultBrowser = os.path.join(".", "tests" , dirname, "index.html")
               with open(test_script_for_app, 'r') as f:
                  test_content = f.read()
                  prefix_contents = 'var options = { "staticArgs": {quitWhenDone: true, "browser": "'+defaultBrowser+'" , "appBasePath": "'+env_root+'" } };' + "\n"

                  try:
                          os.makedirs(os.path.dirname(output_test))
                  except os.error:
                          pass
                  for f in os.listdir(os.path.join(env_root, "modules", "internal", "test_harness")):
                          src = os.path.join(env_root, "modules", "internal", "test_harness", f)
                          dst = os.path.join(os.path.dirname(output_test), os.path.basename(f))
                          if os.path.exists(dst):
                                  continue
                          else:
                                  print "%s does not exist" % dst
                          if platform.system() != 'Windows':
                                  os.symlink(src, dst)
                          else:
                                  shutil.copyfile(src, dst)

                  with open(output_test, 'w') as ff:
                     ff.write(prefix_contents)
                     ff.write(test_content)

               run(arguments=["test",
                              "--pkgdir",
                              "packages/chromeless",
                              "--static-args", json.dumps({"browser": browserToLaunch})],
                   defaults=defaults,
                   env_root=env_root)
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
    elif command == "sdocs":
        import docgen
        import chromeless
        dirname = os.path.join(chromeless.Dirs().build_dir, "docs")
        docgen.generate_static_docs(env_root, dirname)
        print "Created docs in %s." % dirname
        return

    use_main = False
    timeout = None
    inherited_options = ['verbose', 'enable_e10s']

    if command in ("run", "package", "appify"):
        use_main = True
    elif command == "test":
        timeout = TEST_RUN_TIMEOUT
        inherited_options.extend(['iterations', 'filter', 'profileMemory'])
    else:
        print >>sys.stderr, "Unknown command: %s" % command
        print >>sys.stderr, "Try using '--help' for assistance."
        sys.exit(1)

    target = "main"

    # the harness_guid is used for an XPCOM class ID.
    import uuid
    harness_guid = str(uuid.uuid4())

    targets = [target]
    if command == "test":
        targets.append(options.test_runner_pkg)

    if options.extra_packages:
        targets.extend(options.extra_packages.split(","))

    resources = { }
    rootPaths = [ ]
    import chromeless
    path_to_modules = os.path.join(chromeless.Dirs().cuddlefish_root, "modules")
    for f in os.listdir(path_to_modules):
        resourceName = harness_guid + "-" + f
        resources[resourceName] = os.path.join(path_to_modules, f)
        rootPaths.append("resource://" + resourceName + "/");

    # now add custom modules as specified by the app
    app_info = chromeless.AppInfo(dir=options.static_args["browser"])
    if app_info.module_dirs:
        ac_path = options.static_args["browser"]
        if os.path.isfile(ac_path):
            ac_path = os.path.dirname(ac_path)
        for d in app_info.module_dirs:
            resourceName = harness_guid + "-appmodules-" + os.path.basename(d)
            if not os.path.isabs(d):
                d = os.path.normpath(os.path.join(ac_path, d))
            resources[resourceName] = d
            rootPaths.append("resource://" + resourceName + "/")

    harness_contract_id = ('@mozilla.org/harness-service;1?id=%s' % harness_guid)
    harness_options = {
        'bootstrap': {
            'contractID': harness_contract_id,
            'classID': '{%s}' % harness_guid
            },
        'jetpackID': harness_guid,
        'bundleID': harness_guid,
        'staticArgs': options.static_args,
        'resources': resources,
        'loader': "resource://%s-%s/%s" % (harness_guid, "internal", "cuddlefish.js"),
        'rootPaths': rootPaths
        }

    if command == "test":
        harness_options['main'] = 'test_harness/run-tests'
        # XXX: we should write 'test-app' into a tempdir...
        # YYY: testDir is now under the home. Should we place it directly under tempdir?
        harness_options['testDir'] = os.path.join(chromeless.Dirs().home_dir, "modules", "internal", "test_harness")
        resourceName = harness_guid + "-app-tests"
        resources[resourceName] = os.path.join(harness_options['testDir'])
        rootPaths.append("resource://" + resourceName + "/");
    else:
        harness_options['main'] = 'main'

    retval = 0

    a = appifier.Appifier()

    if command == 'package':
       browser_code_path = options.static_args["browser"]
       a.output_xul_app(browser_code=browser_code_path,
                        harness_options=harness_options,
                        dev_mode=False)
    elif command == 'appify':
        browser_code_path = options.static_args["browser"]
        a.output_application(browser_code=browser_code_path,
                             harness_options=harness_options,
                             dev_mode=False)

    else:
        browser_code_path = options.static_args["browser"]

        if options.profiledir:
            options.profiledir = os.path.expanduser(options.profiledir)
            options.profiledir = os.path.abspath(options.profiledir)

        if options.addons is not None:
            options.addons = options.addons.split(",")

        print "app code path: " + browser_code_path

        if (platform.system() == 'Darwin'):
            # because of the manner in which we run the application, we must use a
            # temporary file to enable console output
            [fd, tmppath] = tempfile.mkstemp()
            os.close(fd)

            print "And logging to '%s'" % tmppath

            harness_options['logFile'] = tmppath

            standalone_app_dir = a.output_application(browser_code=browser_code_path, harness_options=harness_options, dev_mode=True, verbose=False)
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
            xul_app_dir = a.output_xul_app(browser_code=browser_code_path,
                                           harness_options=harness_options,
                                           dev_mode=True, verbose=False)
            from cuddlefish.runner import run_app

            try:
                retval = run_app(harness_root_dir=xul_app_dir,
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
