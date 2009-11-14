import sys
import os
import optparse
import subprocess
import time
import tempfile
import atexit
import shutil
import glob

import simplejson as json
import mozrunner
from cuddlefish.prefs import DEFAULT_FIREFOX_PREFS
from cuddlefish.prefs import DEFAULT_THUNDERBIRD_PREFS

mydir = os.path.dirname(os.path.abspath(__file__))

# Maximum time we'll wait for tests to finish, in seconds.
MAX_WAIT_TIMEOUT = 5 * 60

def find_firefox_binary():
    dummy_profile = {}
    runner = mozrunner.FirefoxRunner(profile=dummy_profile)
    return runner.find_binary()

def get_xpts(component_dirs):
    files = []
    for dirname in component_dirs:
        xpts = glob.glob(os.path.join(dirname, '*.xpt'))
        files.extend(xpts)
    return files

def install_xpts(mydir, component_dirs):
    """
    Temporarily 'installs' all XPCOM typelib files in given
    component directories into the harness components directory.

    This is needed because there doesn't seem to be any way to
    temporarily install typelibs during the runtime of a
    XULRunner app.
    """

    my_components_dir = os.path.join(mydir, 'components')
    installed_xpts = []
    xpts = get_xpts(component_dirs)
    for abspath in xpts:
        target = os.path.join(my_components_dir,
                              os.path.basename(abspath))
        shutil.copyfile(abspath, target)
        installed_xpts.append(target)

    @atexit.register
    def cleanup_installed_xpts():
        for path in installed_xpts:
            os.remove(path)

def get_config_in_dir(path):
    package_json = os.path.join(path, 'package.json')
    return json.loads(open(package_json, 'r').read())

def build_config(root_dir, extra_paths=None):
    packages_dir = os.path.join(root_dir, 'packages')
    config = {'paths': []}
    if os.path.exists(packages_dir) and os.path.isdir(packages_dir):
        package_paths = [os.path.join(packages_dir, dirname)
                         for dirname in os.listdir(packages_dir)]
        config['paths'].extend(package_paths)

    if not extra_paths:
        extra_paths = []
    extra_paths.append(root_dir)
    config['paths'].extend(extra_paths)

    paths = [os.path.abspath(path)
             for path in config['paths']]
    paths = list(set(paths))

    config['paths'] = paths
    config['packages'] = {}
    for path in paths:
        pkgconfig = get_config_in_dir(path)
        pkgconfig['root_dir'] = path
        config['packages'][pkgconfig['name']] = pkgconfig
    return config

def get_deps_for_target(pkg_cfg, target):
    visited = []
    deps_left = [target]

    while deps_left:
        dep = deps_left.pop()
        if dep not in visited:
            visited.append(dep)
            dep_cfg = pkg_cfg['packages'][dep]
            deps_left.extend(dep_cfg.get('dependencies', []))

    return visited

def generate_build_for_target(pkg_cfg, target, deps, prefix=''):
    build = {'resources': {},
             'rootPaths': []}

    def add_section_to_build(cfg, section):
        if section in cfg:
            for dirname in cfg[section]:
                name = "-".join([prefix + cfg['name'], dirname])
                build['resources'][name] = os.path.join(cfg['root_dir'],
                                                        dirname)
                build['rootPaths'].insert(0, 'resource://%s/' % name)

    def add_dep_to_build(dep):
        dep_cfg = pkg_cfg['packages'][dep]
        add_section_to_build(dep_cfg, "lib")
        if "loader" in dep_cfg:
            build['loader'] = "resource://%s-%s" % (prefix + dep,
                                                    dep_cfg["loader"])

    target_cfg = pkg_cfg['packages'][target]
    add_section_to_build(target_cfg, "tests")

    for dep in deps:
        add_dep_to_build(dep)

    return build

def call_plugins(pkg_cfg, deps, options):
    for dep in deps:
        dep_cfg = pkg_cfg['packages'][dep]
        dirnames = dep_cfg.get('python-lib', [])
        dirnames = [os.path.join(dep_cfg['root_dir'], dirname)
                    for dirname in dirnames]
        for dirname in dirnames:
            sys.path.append(dirname)
        module_names = dep_cfg.get('python-plugins', [])
        for module_name in module_names:
            module = __import__(module_name)
            module.init(dep_cfg['root_dir'], options)

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

    target_cfg = get_config_in_dir(options.pkgdir)

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
        from cuddlefish.xpcomutils import build_xpcom_components
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

    options.iterations = int(options.iterations)

    if not options.components:
        options.components = []
    else:
        options.components = options.components.split(",")

    options.components = [os.path.abspath(path)
                          for path in options.components]

    pkg_cfg = build_config(os.environ['CUDDLEFISH_ROOT'],
                           [options.pkgdir])
    target = target_cfg['name']

    if command == 'xpi':
        import uuid
        guid = str(uuid.uuid4())
        unique_prefix = '%s-' % guid
    else:
        guid = '6724fc1b-3ec4-40e2-8583-8061088b3185'
        unique_prefix = '%s-' % target

    deps = get_deps_for_target(pkg_cfg, target)
    build = generate_build_for_target(pkg_cfg, target, deps,
                                      prefix=unique_prefix)

    if 'resources' in build:
        resources = build['resources']
        for name in resources:
            resources[name] = os.path.abspath(resources[name])

    resultfile = os.path.join(tempfile.gettempdir(), 'harness_result')
    if os.path.exists(resultfile):
        os.remove(resultfile)

    mydir = os.path.dirname(os.path.abspath(__file__))

    install_xpts(mydir, options.components)

    dep_xpt_dirs = []
    for dep in deps:
        dep_cfg = pkg_cfg['packages'][dep]
        if 'xpcom' in dep_cfg and 'typelibs' in dep_cfg['xpcom']:
            abspath = os.path.join(dep_cfg['root_dir'],
                                   dep_cfg['xpcom']['typelibs'])
            dep_xpt_dirs.append(abspath)

    harness_options = {
        'resultFile': resultfile,
        'bootstrap': {
            'contractID': '@mozilla.org/harness/service;1;%s' % guid,
            'classID': '{%s}' % guid
            }
        }

    if use_main:
        harness_options['main'] = target_cfg['main']

    harness_options.update(build)
    for option in parser.option_list[1:]:
        harness_options[option.dest] = getattr(options, option.dest)

    if use_main:
        del harness_options['iterations']
    else:
        harness_options['runTests'] = True

    if command == 'xpi':
        del harness_options['resultFile']

    del harness_options['app']
    del harness_options['binary']

    call_plugins(pkg_cfg, deps, options)

    if command == 'xpi':
        from cuddlefish.xpi import build_xpi
        build_xpi(template_root_dir=mydir,
                  target_cfg=target_cfg,
                  xpi_name=xpi_name,
                  harness_options=harness_options,
                  xpts=get_xpts(dep_xpt_dirs))
        sys.exit(0)

    install_xpts(mydir, dep_xpt_dirs)

    env = {}
    env.update(os.environ)
    env['MOZ_NO_REMOTE'] = '1'
    env['HARNESS_OPTIONS'] = json.dumps(harness_options)

    if options.verbose:
        print "Configuration: %s" % json.dumps(harness_options)

    starttime = time.time()

    popen_kwargs = {}

    if options.app == "xulrunner":
        # TODO: We're reduplicating a lot of mozrunner logic here,
        # we should probably just get mozrunner to support this
        # use case.

        xulrunner_profile = tempfile.mkdtemp(suffix='.harness')
        cmdline = [options.binary,
                   '-app',
                   os.path.join(mydir, 'application.ini'),
                   '-profile', xulrunner_profile]

        @atexit.register
        def remove_xulrunner_profile():
            try:
                shutil.rmtree(xulrunner_profile)
            except OSError:
                pass

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
        if use_main:
            print "Program terminated successfully."
        else:
            print "All tests succeeded."
        retval = 0
    else:
        if use_main:
            print "Program terminated unsuccessfully."
        else:
            print "Some tests failed."
        retval = -1
    sys.exit(retval)
