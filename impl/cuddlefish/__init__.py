import sys
import os
import optparse
import glob
import platform
import appifier
import subprocess
import signal
import tempfile

from copy import copy
import simplejson as json
from cuddlefish import packaging
from cuddlefish.bunch import Bunch

MOZRUNNER_BIN_NOT_FOUND = 'Mozrunner could not locate your binary'
MOZRUNNER_BIN_NOT_FOUND_HELP = """
I can't find the application binary in any of its default locations
on your system. Please specify one using the -b/--binary option.
"""

UPDATE_RDF_FILENAME = "%s.update.rdf"

usage = """
%prog [options] [command]

Package-Specific Commands:
  xpcom      - build xpcom component
  package    - generate a stanalone xulrunner app directory
  test       - run tests
  run        - run program

Global Commands:
  docs       - view web-based documentation
  sdocs      - export static documentation
  develop    - run development server

Global Tests:
  testcfx    - test the cfx tool
  testex     - test all example code
  testpkgs   - test all installed packages
  testall    - test whole environment
"""

parser_options = {
    ("-v", "--verbose",): dict(dest="verbose",
                               help="enable lots of output",
                               action="store_true",
                               default=False),
    ("-g", "--use-config",): dict(dest="config",
                                  help="use named config from local.json",
                                  metavar=None,
                                  default="default"),
    ("-t", "--templatedir",): dict(dest="templatedir",
                                   help="XULRunner app/ext. template",
                                   metavar=None,
                                   default=None),
    ("-k", "--extra-packages",): dict(dest="extra_packages",
                                      help=("extra packages to include, "
                                            "comma-separated. Default is "
                                            "'chromeless-kit'."),
                                      metavar=None,
                                      default="chromeless-kit"),
    ("-p", "--pkgdir",): dict(dest="pkgdir",
                              help=("package dir containing "
                                    "package.json; default is "
                                    "current directory"),
                              metavar=None,
                              default=None),
    ("--keydir",): dict(dest="keydir",
                        help=("directory holding private keys;"
                              " default is ~/.jetpack/keys"),
                        metavar=None,
                        default=os.path.expanduser("~/.jetpack/keys")),
    ("--static-args",): dict(dest="static_args",
                             help="extra harness options as JSON",
                             type="json",
                             metavar=None,
                             default="{}"),
    }

parser_groups = Bunch(
    app=Bunch(
        name="Application Options",
        options={
            ("-P", "--profiledir",): dict(dest="profiledir",
                                          help=("profile directory to "
                                                "pass to app"),
                                          metavar=None,
                                          default=None),
            ("-b", "--binary",): dict(dest="binary",
                                      help="path to app binary", 
                                      metavar=None,
                                      default=None),
            ("", "--addons",): dict(dest="addons",
                                    help=("paths of addons to install, "
                                          "comma-separated"),
                                    metavar=None, default=None),
            ("-a", "--app",): dict(dest="app",
                                   help=("app to run: "
                                         "firefox (default), xulrunner, "
                                         "fennec, or thunderbird"),
                                   metavar=None,
                                   default="firefox"),
            ("-f", "--logfile",): dict(dest="logfile",
                                       help="log console output to file",
                                       metavar=None,
                                       default=None),
            ("-r", "--use-server",): dict(dest="use_server",
                                          help="use development server",
                                          action="store_true",
                                          default=False),
            }
        ),
    xpcom=Bunch(
        name="XPCOM Compilation Options",
        options={
            ("-s", "--srcdir",): dict(dest="moz_srcdir",
                                      help="Mozilla source dir",
                                      metavar=None,
                                      default=None),
            ("-o", "--objdir",): dict(dest="moz_objdir",
                                      help="Mozilla objdir",
                                      metavar=None,
                                      default=None),
            }
        ),
    tests=Bunch(
        name="Testing Options",
        options={
            ("", "--test-runner-pkg",): dict(dest="test_runner_pkg",
                                             help=("name of package "
                                                   "containing test runner "
                                                   "program (default is "
                                                   "test-harness)"),
                                             default="test-harness"),
            ("-d", "--dep-tests",): dict(dest="dep_tests",
                                         help="include tests for all deps",
                                         action="store_true",
                                         default=False),
            ("-x", "--times",): dict(dest="iterations",
                                     type="int",
                                     help="number of times to run tests",
                                     default=1),
            ("-F", "--filter",): dict(dest="filter",
                                      help="only run tests that match regexp",
                                      metavar=None,
                                      default=None),
            # TODO: This should default to true once our memory debugging
            # issues are resolved; see bug 592774.
            ("-m", "--profile-memory",): dict(dest="profileMemory",
                                              help=("profile memory usage "
                                                    "(default is false)"),
                                              type="int",
                                              action="store",
                                              default=0)
            }
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
    try:
        # Make sure value is JSON, but keep it JSON.
        return json.dumps(json.loads(value))
    except ValueError:
        raise optparse.OptionValueError("Option %s must be JSON." % opt)

class CfxOption(optparse.Option):
    TYPES = optparse.Option.TYPES + ('json',)
    TYPE_CHECKER = copy(optparse.Option.TYPE_CHECKER)
    TYPE_CHECKER['json'] = check_json

def parse_args(arguments, parser_options, usage, parser_groups=None,
               defaults=None):
    parser = optparse.OptionParser(usage=usage.strip(), option_class=CfxOption)

    for names, opts in parser_options.items():
        parser.add_option(*names, **opts)

    if parser_groups:
        for group_info in parser_groups.values():
            group = optparse.OptionGroup(parser, group_info.name,
                                         group_info.get('description'))
            for names, opts in group_info.options.items():
                group.add_option(*names, **opts)
            parser.add_option_group(group)

    if defaults:
        parser.set_defaults(**defaults)

    (options, args) = parser.parse_args(args=arguments)

    if not args:
        parser.print_help()
        parser.exit()

    return (options, args)

def get_xpts(component_dirs):
    files = []
    for dirname in component_dirs:
        xpts = glob.glob(os.path.join(dirname, '*.xpt'))
        files.extend(xpts)
    return files

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
    examples_dir = os.path.join(env_root, "examples")
    examples = [dirname for dirname in os.listdir(examples_dir)
                if os.path.isdir(os.path.join(examples_dir, dirname))]
    examples.sort()
    for dirname in examples:
        print "Testing %s..." % dirname
        run(arguments=["test",
                       "--pkgdir",
                       os.path.join(examples_dir, dirname)],
            defaults=defaults,
            env_root=env_root)

def test_all_packages(env_root, defaults):
    deps = []
    target_cfg = Bunch(name = "testpkgs", dependencies = deps)
    pkg_cfg = packaging.build_config(env_root, target_cfg)
    for name in pkg_cfg.packages:
        if name != "testpkgs":
            deps.append(name)
    print "Testing all available packages: %s." % (", ".join(deps))
    run(arguments=["test", "--dep-tests"],
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
                         parser_options=parser_options,
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

    use_main = False
    if command == "xpcom":
        if 'xpcom' not in target_cfg:
            print >>sys.stderr, "package.json does not have a 'xpcom' entry."
            sys.exit(1)
        if not (options.moz_srcdir and options.moz_objdir):
            print >>sys.stderr, "srcdir and objdir not specified."
            sys.exit(1)
        options.moz_srcdir = os.path.expanduser(options.moz_srcdir)
        options.moz_objdir = os.path.expanduser(options.moz_objdir)
        xpcom = target_cfg.xpcom
        from cuddlefish.xpcom import build_xpcom_components
        if 'typelibs' in xpcom:
            xpt_output_dir = packaging.resolve_dir(target_cfg,
                                                   xpcom.typelibs)
        else:
            xpt_output_dir = None
        build_xpcom_components(
            comp_src_dir=packaging.resolve_dir(target_cfg, xpcom.src),
            moz_srcdir=options.moz_srcdir,
            moz_objdir=options.moz_objdir,
            base_output_dir=packaging.resolve_dir(target_cfg, xpcom.dest),
            xpt_output_dir=xpt_output_dir,
            module_name=xpcom.module
            )
        sys.exit(0)
    elif command == "package":
        use_main = True
    elif command == "appify":
        use_main = True
    elif command == "test":
        if 'tests' not in target_cfg:
            target_cfg['tests'] = []
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

    # TODO: Consider keeping a cache of dynamic UUIDs, based
    # on absolute filesystem pathname, in the root directory
    # or something.
    if command in ('package', 'run', 'appify'):
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
        jid = target_cfg["id"]
        assert not jid.endswith("@jetpack")
        unique_prefix = '%s-' % jid # used for resource: URLs

        # the harness_guid is used for an XPCOM class ID. We use the
        # JetpackID for the add-on ID and the XPCOM contract ID.
        import uuid
        harness_guid = str(uuid.uuid4())

    else:
        if options.use_server:
            harness_guid = '2974c5b5-b671-46f8-a4bb-63c6eca6261b'
        else:
            harness_guid = '6724fc1b-3ec4-40e2-8583-8061088b3185'
        unique_prefix = '%s-' % target
        jid = harness_guid

    assert not jid.endswith("@jetpack")
    bundle_id = jid + "@jetpack"
    # the resource: URLs prefix is treated too much like a DNS hostname
    unique_prefix = unique_prefix.lower()
    assert "@" not in unique_prefix
    assert "." not in unique_prefix

    timeout = None
    targets = [target]
    if not use_main:
        timeout = TEST_RUN_TIMEOUT
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

    dep_xpt_dirs = []
    for dep in deps:
        dep_cfg = pkg_cfg.packages[dep]
        if 'xpcom' in dep_cfg and 'typelibs' in dep_cfg.xpcom:
            abspath = packaging.resolve_dir(dep_cfg,
                                            dep_cfg.xpcom.typelibs)
            dep_xpt_dirs.append(abspath)
    xpts = get_xpts(dep_xpt_dirs)

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

    inherited_options = ['verbose']

    if use_main:
        harness_options['main'] = target_cfg.get('main')
    else:
        harness_options['main'] = "run-tests"
        inherited_options.extend(['iterations', 'filter', 'profileMemory'])

    for option in inherited_options:
        harness_options[option] = getattr(options, option)

    harness_options['metadata'] = packaging.get_metadata(pkg_cfg, deps)
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
      
    else:
        # on OSX we must invoke xulrunner from within a proper .app bundle,
        # otherwise many basic application features will not work.  For instance
        # keyboard focus and mouse interactions will be broken.
        # for this reason, on OSX we'll actually generate a full standalone
        # application and launch that using the open command.  On other
        # platforms we'll build a xulrunner application (directory) and
        # invoke xulrunner-bin pointing at that. 

        browser_code_path = json.loads(options.static_args)["browser"]

        if options.profiledir:
            options.profiledir = os.path.expanduser(options.profiledir)
            options.profiledir = os.path.abspath(options.profiledir)

        if (platform.system() == 'Darwin'): 
            # because of the manner in which we run the application, we must use a
            # temporary file to enable console output
            [fd, tmppath] = tempfile.mkstemp()
            os.close(fd)

            print "logging to '%s'" % tmppath
            harness_options['logFile'] = tmppath
            standalone_app_dir = a.output_application(browser_code=browser_code_path,
                                                      harness_options=harness_options,
                                                      dev_mode=True)
            print "opening '%s'" % standalone_app_dir

            tailProcess = None
            try:
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
                                           dev_mode=True)

            from cuddlefish.runner import run_app

            if options.addons is not None:
                options.addons = options.addons.split(",")

            try:
                retval = run_app(harness_root_dir=xul_app_dir,
                                 harness_options=harness_options,
                                 xpts=xpts,
                                 app_type=options.app,
                                 binary=options.binary,
                                 profiledir=options.profiledir,
                                 verbose=options.verbose,
                                 timeout=timeout,
                                 logfile=options.logfile,
                                 addons=options.addons)
            except Exception, e:
                if e.message.startswith(MOZRUNNER_BIN_NOT_FOUND):
                    print >>sys.stderr, MOZRUNNER_BIN_NOT_FOUND_HELP.strip()
                    retval = -1
                else:
                    raise
        sys.exit(retval)
