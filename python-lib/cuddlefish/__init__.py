import sys
import os
import optparse
import glob

from cuddlefish import packaging

def get_xpts(component_dirs):
    files = []
    for dirname in component_dirs:
        xpts = glob.glob(os.path.join(dirname, '*.xpt'))
        files.extend(xpts)
    return files

usage = """
%(progname)s [options] [command]

Commands:
  xpcom - build xpcom component
  xpi   - generate an xpi
  test  - run tests
  run   - run program
"""

def run():
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
        ("-s", "--srcdir",): dict(dest="moz_srcdir",
                                  help="Mozilla source dir",
                                  metavar=None,
                                  default=None),
        ("-o", "--objdir",): dict(dest="moz_objdir",
                                  help="Mozilla objdir",
                                  metavar=None,
                                  default=None),
        ("-t", "--templatedir",): dict(dest="templatedir",
                                       help="XULRunner app/ext. template",
                                       metavar=None,
                                       default=None),
        ("-p", "--pkgdir",): dict(dest="pkgdir",
                                  help=("package dir containing "
                                        "package.json; default is "
                                        "current directory"),
                                  metavar=None,
                                  default=os.getcwd()),
        }

    progname = os.path.basename(sys.argv[0])
    parser = optparse.OptionParser(
        usage=(usage.strip() % dict(progname=progname))
        )

    for names, opts in parser_options.items():
        parser.add_option(*names, **opts)
    (options, args) = parser.parse_args()

    if not args:
        parser.print_help()
        parser.exit()

    options.pkgdir = os.path.abspath(options.pkgdir)
    if not os.path.exists(os.path.join(options.pkgdir, 'package.json')):
        print "cannot find 'package.json' in %s." % options.pkgdir
        sys.exit(1)

    target_cfg = packaging.get_config_in_dir(options.pkgdir)

    use_main = False
    command = args[0]
    if command == "xpcom":
        if 'xpcom' not in target_cfg:
            print "package.json does not have a 'xpcom' entry."
            sys.exit(1)
        if not (options.moz_srcdir and options.moz_objdir):
            print "srcdir and objdir not specified."
            sys.exit(1)
        options.moz_srcdir = os.path.expanduser(options.moz_srcdir)
        options.moz_objdir = os.path.expanduser(options.moz_objdir)
        xpcom = target_cfg['xpcom']
        from cuddlefish.xpcom import build_xpcom_components
        if 'typelibs' in xpcom:
            xpt_output_dir = os.path.join(options.pkgdir,
                                          xpcom['typelibs'])
        else:
            xpt_output_dir = None
        build_xpcom_components(
            comp_src_dir=os.path.join(options.pkgdir, xpcom['src']),
            moz_srcdir=options.moz_srcdir,
            moz_objdir=options.moz_objdir,
            base_output_dir=os.path.join(options.pkgdir, xpcom['dest']),
            xpt_output_dir=xpt_output_dir,
            module_name=xpcom['module']
            )
        sys.exit(0)
    elif command == "xpi":
        if options.components:
            print ("The --components option may not be used when "
                   "building an xpi.")
            sys.exit(1)
        xpi_name = "%s.xpi" % target_cfg['name']
        use_main = True
    elif command == "test":
        if 'tests' not in target_cfg:
            print "package.json does not have a 'tests' entry."
            sys.exit(1)
    elif command == "run":
        use_main = True
    else:
        print "Unknown command: %s\n" % command
        parser.print_help()
        parser.exit()

    if use_main and 'main' not in target_cfg:
        print "package.json does not have a 'main' entry."
        sys.exit(1)

    options.iterations = int(options.iterations)

    if not options.components:
        options.components = []
    else:
        options.components = options.components.split(",")

    options.components = [os.path.abspath(path)
                          for path in options.components]

    pkg_cfg = packaging.build_config(os.environ['CUDDLEFISH_ROOT'],
                                     [options.pkgdir])
    target = target_cfg['name']

    if command == 'xpi':
        import uuid
        harness_guid = str(uuid.uuid4())
        unique_prefix = '%s-' % harness_guid
    else:
        harness_guid = '6724fc1b-3ec4-40e2-8583-8061088b3185'
        unique_prefix = '%s-' % target

    identifier = target_cfg.get('id', '{%s}' % harness_guid)

    targets = [target]
    if not use_main:
        targets.append("test-harness")

    deps = packaging.get_deps_for_targets(pkg_cfg, targets)
    build = packaging.generate_build_for_target(pkg_cfg, target, deps,
                                                prefix=unique_prefix)

    if 'resources' in build:
        resources = build['resources']
        for name in resources:
            resources[name] = os.path.abspath(resources[name])

    dep_xpt_dirs = []
    for dep in deps:
        dep_cfg = pkg_cfg['packages'][dep]
        if 'xpcom' in dep_cfg and 'typelibs' in dep_cfg['xpcom']:
            abspath = os.path.join(dep_cfg['root_dir'],
                                   dep_cfg['xpcom']['typelibs'])
            dep_xpt_dirs.append(abspath)
    dep_xpt_dirs.extend(options.components)
    xpts = get_xpts(dep_xpt_dirs)

    harness_contract_id = ('@mozilla.org/harness/service;1?id=%s' %
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
        harness_options['main'] = target_cfg['main']
    else:
        harness_options['main'] = "run-tests"
        inherited_options.extend(['iterations', 'components'])

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
        build_xpi(template_root_dir=app_extension_dir,
                  target_cfg=target_cfg,
                  xpi_name=xpi_name,
                  harness_options=harness_options,
                  xpts=xpts,
                  default_id=identifier)
    else:
        from cuddlefish.runner import run_app
        retval = run_app(harness_root_dir=app_extension_dir,
                         harness_options=harness_options,
                         xpts=xpts,
                         app_type=options.app,
                         binary=options.binary,
                         verbose=options.verbose)

    sys.exit(retval)
