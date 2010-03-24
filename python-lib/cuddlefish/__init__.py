import sys
import os
import optparse
import glob

from cuddlefish import packaging
from cuddlefish.bunch import Bunch

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
  testcfx    - test the cfx tool
  testall    - test all packages
"""

parser_options = {
    ("-v", "--verbose",): dict(dest="verbose",
                               help="enable lots of output",
                               action="store_true",
                               default=False),
    ("-g", "--use-config",): dict(dest="config",
                                  help="use named config from local.json",
                                  metavar=None,
                                  default=None),
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
                                   help=("app to run: xulrunner (default), "
                                         "firefox, or thunderbird"),
                                   metavar=None,
                                   default="xulrunner"),
            ("-f", "--logfile",): dict(dest="logfile",
                                       help="log console output to file",
                                       metavar=None,
                                       default=None),
            ("", "--use-server",): dict(dest="use_server",
                                        help="use task queue server",
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

def test_all_packages(env_root, defaults):
    deps = []
    target_cfg = Bunch(name = "testall", dependencies = deps)
    pkg_cfg = packaging.build_config(env_root, target_cfg)
    for name in pkg_cfg.packages:
        if name != "testall":
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
        print "File does not exist: %s" % local_json
        sys.exit(1)
    local_json = packaging.load_json_file(local_json)
    if 'configs' not in local_json:
        print "'configs' key not found in local.json."
        sys.exit(1)
    if name not in local_json.configs:
        print "No config found for '%s'." % name
        sys.exit(1)
    config = local_json.configs[name]
    if type(config) != list:
        print "Config for '%s' must be a list of strings." % name
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

    if options.config:
        parser_kwargs['arguments'] += get_config_args(options.config,
                                                      env_root)
        (options, args) = parse_args(**parser_kwargs)

    command = args[0]

    if command == "testall":
        test_all_packages(env_root, defaults=options.__dict__)
        return
    elif command == "testcfx":
        import cuddlefish.tests

        cuddlefish.tests.run(options.verbose)
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

    if not target_cfg:
        if not options.pkgdir:
            options.pkgdir = find_parent_package(os.getcwd())
            if not options.pkgdir:
                print ("cannot find 'package.json' in the current "
                       "directory or any parent.")
                sys.exit(1)
        else:
            options.pkgdir = os.path.abspath(options.pkgdir)
        if not os.path.exists(os.path.join(options.pkgdir, 'package.json')):
            print "cannot find 'package.json' in %s." % options.pkgdir
            sys.exit(1)

        target_cfg = packaging.get_config_in_dir(options.pkgdir)

    use_main = False
    if command == "xpcom":
        if 'xpcom' not in target_cfg:
            print "package.json does not have a 'xpcom' entry."
            sys.exit(1)
        if not (options.moz_srcdir and options.moz_objdir):
            print "srcdir and objdir not specified."
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
        print "Unknown command: %s" % command
        print "Try using '--help' for assistance."
        sys.exit(1)

    if use_main and 'main' not in target_cfg:
        # If the user supplies a template dir, then the main
        # program may be contained in the template.
        if not options.templatedir:
            print "package.json does not have a 'main' entry."
            sys.exit(1)

    if not pkg_cfg:
        pkg_cfg = packaging.build_config(env_root, target_cfg)

    target = target_cfg.name

    # TODO: Consider keeping a cache of dynamic UUIDs, based
    # on absolute filesystem pathname, in the root directory
    # or something.
    if command == 'xpi':
        import uuid
        harness_guid = str(uuid.uuid4())
        unique_prefix = '%s-' % harness_guid
    else:
        if options.use_server:
            harness_guid = '2974c5b5-b671-46f8-a4bb-63c6eca6261b'
        else:
            harness_guid = '6724fc1b-3ec4-40e2-8583-8061088b3185'
        unique_prefix = '%s-' % target

    identifier = target_cfg.get('id', '{%s}' % harness_guid)

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
        prefix=unique_prefix,
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

    harness_contract_id = ('@mozilla.org/harness-service;1?id=%s' %
                           identifier)
    harness_options = {
        'bootstrap': {
            'contractID': harness_contract_id,
            'classID': '{%s}' % harness_guid
            }
        }

    harness_options.update(build)

    inherited_options = ['verbose']

    if use_main:
        harness_options['main'] = target_cfg.get('main')
    else:
        harness_options['main'] = "run-tests"
        inherited_options.extend(['iterations'])

    for option in inherited_options:
        harness_options[option] = getattr(options, option)

    harness_options['metadata'] = packaging.get_metadata(pkg_cfg, deps)
    packaging.call_plugins(pkg_cfg, deps)

    retval = 0

    if options.templatedir:
        app_extension_dir = os.path.abspath(options.templatedir)
    else:
        app_extension_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "app-extension"
            )

    if command == 'xpi':
        from cuddlefish.xpi import build_xpi
        from cuddlefish.rdf import gen_manifest, RDFUpdate

        manifest = gen_manifest(template_root_dir=app_extension_dir,
                                target_cfg=target_cfg,
                                default_id=identifier,
                                update_url=options.update_url)

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

        retval = run_app(harness_root_dir=app_extension_dir,
                         harness_options=harness_options,
                         xpts=xpts,
                         app_type=options.app,
                         binary=options.binary,
                         profiledir=options.profiledir,
                         verbose=options.verbose,
                         timeout=timeout,
                         logfile=options.logfile)

    sys.exit(retval)
