import sys
import os
import optparse
import glob

from cuddlefish import packaging
from cuddlefish.bunch import Bunch

MOZRUNNER_BIN_NOT_FOUND = 'Mozrunner could not locate your binary'
MOZRUNNER_BIN_NOT_FOUND_HELP = """
I can't find the application binary in any of its default locations
on your system. Please specify one using the -b/--binary option.
"""

UPDATE_RDF_FILENAME = "%s.update.rdf"
XPI_FILENAME = "%s.xpi"

usage = """
%prog [options] [command]

Package-Specific Commands:
  xpcom      - build xpcom component
  xpi        - generate an xpi
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
                                      help="extra packages to include, comma-separated",
                                      metavar=None,
                                      default=None),
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
    }

parser_groups = Bunch(
    xpi=Bunch(
        name="XPI Options",
        options={
            ("-u", "--update-url",): dict(dest="update_url",
                                          help="update URL in install.rdf",
                                          metavar=None,
                                          default=None),
            ("-l", "--update-link",): dict(dest="update_link",
                                           help="generate update.rdf",
                                           metavar=None,
                                           default=None),
            }
        ),
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

def parse_args(arguments, parser_options, usage, parser_groups=None,
               defaults=None):
    parser = optparse.OptionParser(usage=usage.strip())

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
    print "'-r' as an option to send the cfx command to this instance."
    print "All logging messages will appear below."

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
        import cuddlefish.server

        # TODO: Allow user to change this filename via cmd line.
        filename = 'jetpack-sdk-docs.tgz'
        cuddlefish.server.generate_static_docs(env_root, filename)
        print "Wrote %s." % filename
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
    elif command == "xpi":
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
    if command in ('xpi', 'run'):
        from cuddlefish.preflight import preflight_config
        if target_cfg_json:
            config_was_ok, modified = preflight_config(target_cfg,
                                                       target_cfg_json,
                                                       keydir=options.keydir)
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
        targets.append("test-harness")

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
        }

    harness_options.update(build)

    inherited_options = ['verbose']

    if use_main:
        harness_options['main'] = target_cfg.get('main')
    else:
        harness_options['main'] = "run-tests"
        inherited_options.extend(['iterations', 'filter'])

    for option in inherited_options:
        harness_options[option] = getattr(options, option)

    harness_options['metadata'] = packaging.get_metadata(pkg_cfg, deps)
    packaging.call_plugins(pkg_cfg, deps)

    retval = 0

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

    if command == 'xpi':
        from cuddlefish.xpi import build_xpi
        from cuddlefish.rdf import gen_manifest, RDFUpdate

        manifest = gen_manifest(template_root_dir=app_extension_dir,
                                target_cfg=target_cfg,
                                bundle_id=bundle_id,
                                update_url=options.update_url,
                                bootstrap=True)

        if options.update_link:
            rdf_name = UPDATE_RDF_FILENAME % target_cfg.name
            print "Exporting update description to %s." % rdf_name
            update = RDFUpdate()
            update.add(manifest, options.update_link)
            open(rdf_name, "w").write(str(update))

        xpi_name = XPI_FILENAME % target_cfg.name
        print "Exporting extension to %s." % xpi_name
        build_xpi(template_root_dir=app_extension_dir,
                  manifest=manifest,
                  xpi_name=xpi_name,
                  harness_options=harness_options,
                  xpts=xpts)
    else:
        if options.use_server:
            from cuddlefish.server import run_app
        else:
            from cuddlefish.runner import run_app

        if options.profiledir:
            options.profiledir = os.path.expanduser(options.profiledir)

        try:
            retval = run_app(harness_root_dir=app_extension_dir,
                             harness_options=harness_options,
                             xpts=xpts,
                             app_type=options.app,
                             binary=options.binary,
                             profiledir=options.profiledir,
                             verbose=options.verbose,
                             timeout=timeout,
                             logfile=options.logfile)
        except Exception, e:
            if e.message.startswith(MOZRUNNER_BIN_NOT_FOUND):
                print >>sys.stderr, MOZRUNNER_BIN_NOT_FOUND_HELP.strip()
                retval = -1
            else:
                raise
    sys.exit(retval)
