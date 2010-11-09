import os
import sys
import re

import simplejson as json
from cuddlefish.bunch import Bunch

MANIFEST_NAME = 'package.json'

DEFAULT_LOADER = 'jetpack-core'

DEFAULT_PROGRAM_MODULE = 'main'

METADATA_PROPS = ['name', 'description', 'keywords', 'author',
                  'contributors', 'license', 'url']

RESOURCE_HOSTNAME_RE = re.compile(r'^[a-z0-9_\-]+$')

class Error(Exception):
    pass

class MalformedPackageError(Error):
    pass

class MalformedJsonFileError(Error):
    pass

class DuplicatePackageError(Error):
    pass

class PackageNotFoundError(Error):
    def __init__(self, missing_package, reason):
        self.missing_package = missing_package
        self.reason = reason
    def __str__(self):
        return "%s (%s)" % (self.missing_package, self.reason)

class BadChromeMarkerError(Error):
    pass

def validate_resource_hostname(name):
    """
    Validates the given hostname for a resource: URI.

    For more information, see:

      https://bugzilla.mozilla.org/show_bug.cgi?id=566812#c13

    Examples:

      >>> validate_resource_hostname('blarg')

      >>> validate_resource_hostname('BLARG')
      Traceback (most recent call last):
      ...
      ValueError: invalid resource hostname: BLARG

      >>> validate_resource_hostname('foo@bar')
      Traceback (most recent call last):
      ...
      ValueError: invalid resource hostname: foo@bar
    """

    if not RESOURCE_HOSTNAME_RE.match(name):
        raise ValueError('invalid resource hostname: %s' % name)

def find_packages_with_module(pkg_cfg, name):
    # TODO: Make this support more than just top-level modules.
    filename = "%s.js" % name
    packages = []
    for cfg in pkg_cfg.packages.itervalues():
        if 'lib' in cfg:
            matches = [dirname for dirname in resolve_dirs(cfg, cfg.lib)
                       if os.path.exists(os.path.join(dirname, filename))]
            if matches:
                packages.append(cfg.name)
    return packages

def resolve_dirs(pkg_cfg, dirnames):
    for dirname in dirnames:
        yield resolve_dir(pkg_cfg, dirname)

def resolve_dir(pkg_cfg, dirname):
    return os.path.join(pkg_cfg.root_dir, dirname)

def get_metadata(pkg_cfg, deps):
    metadata = Bunch()
    for pkg_name in deps:
        cfg = pkg_cfg.packages[pkg_name]
        metadata[pkg_name] = Bunch()
        for prop in METADATA_PROPS:
            if cfg.get(prop):
                metadata[pkg_name][prop] = cfg[prop]
    return metadata

def is_dir(path):
    return os.path.exists(path) and os.path.isdir(path)

def apply_default_dir(base_json, base_path, dirname):
    if (not base_json.get(dirname) and
        is_dir(os.path.join(base_path, dirname))):
        base_json[dirname] = dirname

def normalize_string_or_array(base_json, key):
    if base_json.get(key):
        if isinstance(base_json[key], basestring):
            base_json[key] = [base_json[key]]

def load_json_file(path):
    data = open(path, 'r').read()
    try:
        return Bunch(json.loads(data))
    except ValueError, e:
        raise MalformedJsonFileError('%s when reading "%s"' % (str(e),
                                                               path))

def get_config_in_dir(path):
    package_json = os.path.join(path, MANIFEST_NAME)
    if not (os.path.exists(package_json) and
            os.path.isfile(package_json)):
        raise MalformedPackageError('%s not found in "%s"' % (MANIFEST_NAME,
                                                              path))
    base_json = load_json_file(package_json)

    if 'name' not in base_json:
        base_json.name = os.path.basename(path)

    for dirname in ['lib', 'tests', 'data', 'packages']:
        apply_default_dir(base_json, path, dirname)

    for key in ['lib', 'tests', 'dependencies', 'packages']:
        normalize_string_or_array(base_json, key)

    if 'xpcom' in base_json:
        base_json.xpcom = Bunch(base_json.xpcom)

    if 'main' not in base_json and 'lib' in base_json:
        for dirname in base_json['lib']:
            program = os.path.join(path, dirname,
                                   '%s.js' % DEFAULT_PROGRAM_MODULE)
            if os.path.exists(program):
                base_json['main'] = DEFAULT_PROGRAM_MODULE
                break

    base_json.root_dir = path

    return base_json

def _is_same_file(a, b):
    if hasattr(os.path, 'samefile'):
        return os.path.samefile(a, b)
    return a == b

def build_config(root_dir, target_cfg):
    dirs_to_scan = []

    def add_packages_from_config(pkgconfig):
        if 'packages' in pkgconfig:
            for package_dir in resolve_dirs(pkgconfig, pkgconfig.packages):
                dirs_to_scan.append(package_dir)

    add_packages_from_config(target_cfg)

    packages_dir = os.path.join(root_dir, 'packages')
    if os.path.exists(packages_dir) and os.path.isdir(packages_dir):
        dirs_to_scan.append(packages_dir)

    packages = Bunch({target_cfg.name: target_cfg})

    while dirs_to_scan:
        packages_dir = dirs_to_scan.pop()
        package_paths = [os.path.join(packages_dir, dirname)
                         for dirname in os.listdir(packages_dir)
                         if not dirname.startswith('.')]

        for path in package_paths:
            # ignore non-directories
            if not os.path.isdir(path):
                continue
            pkgconfig = get_config_in_dir(path)
            if pkgconfig.name in packages:
                otherpkg = packages[pkgconfig.name]
                if not _is_same_file(otherpkg.root_dir, path):
                    raise DuplicatePackageError(path, otherpkg.root_dir)
            else:
                packages[pkgconfig.name] = pkgconfig
                add_packages_from_config(pkgconfig)

    return Bunch(packages=packages)

def get_deps_for_targets(pkg_cfg, targets):
    visited = []
    deps_left = [[dep, None] for dep in list(targets)]

    while deps_left:
        [dep, required_by] = deps_left.pop()
        if dep not in visited:
            visited.append(dep)
            if dep not in pkg_cfg.packages:
                required_reason = ("required by '%s'" % (required_by)) \
                                    if required_by is not None \
                                    else "specified as target"
                raise PackageNotFoundError(dep, required_reason)
            dep_cfg = pkg_cfg.packages[dep]
            deps_left.extend([[i, dep] for i in dep_cfg.get('dependencies', [])])

    return visited

def generate_build_for_target(pkg_cfg, target, deps, prefix='',
                              include_tests=True,
                              include_dep_tests=False,
                              default_loader=DEFAULT_LOADER):
    validate_resource_hostname(prefix)

    manifest = []
    build = Bunch(resources=Bunch(),
                  resourcePackages=Bunch(),
                  packageData=Bunch(),
                  rootPaths=[],
                  manifest=manifest,
                  )

    def add_section_to_build(cfg, section, is_code=False,
                             is_data=False):
        if section in cfg:
            dirnames = cfg[section]
            if isinstance(dirnames, basestring):
                # This is just for internal consistency within this
                # function, it has nothing to do w/ a non-canonical
                # configuration dict.
                dirnames = [dirnames]
            for dirname in resolve_dirs(cfg, dirnames):
                name = "-".join([prefix + cfg.name,
                                 os.path.basename(dirname)])
                validate_resource_hostname(name)
                if name in build.resources:
                    raise KeyError('resource already defined', name)
                build.resourcePackages[name] = cfg.name
                build.resources[name] = dirname
                resource_url = 'resource://%s/' % name

                if is_code:
                    build.rootPaths.insert(0, resource_url)
                    from manifest import scan_package
                    pkg_manifest, problems = scan_package(cfg.name, dirname)
                    if problems:
                        # the relevant instructions have already been written
                        # to stderr
                        raise BadChromeMarkerError()
                    manifest.extend(pkg_manifest)

                if is_data:
                    build.packageData[cfg.name] = resource_url

    def add_dep_to_build(dep):
        dep_cfg = pkg_cfg.packages[dep]
        add_section_to_build(dep_cfg, "lib", is_code=True)
        add_section_to_build(dep_cfg, "data", is_data=True)
        if include_tests and include_dep_tests:
            add_section_to_build(dep_cfg, "tests", is_code=True)
        if ("loader" in dep_cfg) and ("loader" not in build):
            build.loader = "resource://%s-%s" % (prefix + dep,
                                                 dep_cfg.loader)

    target_cfg = pkg_cfg.packages[target]
    if include_tests and not include_dep_tests:
        add_section_to_build(target_cfg, "tests", is_code=True)

    for dep in deps:
        add_dep_to_build(dep)

    if 'loader' not in build:
        add_dep_to_build(DEFAULT_LOADER)

    return build

def call_plugins(pkg_cfg, deps):
    for dep in deps:
        dep_cfg = pkg_cfg.packages[dep]
        dirnames = dep_cfg.get('python-lib', [])
        for dirname in resolve_dirs(dep_cfg, dirnames):
            sys.path.append(dirname)
        module_names = dep_cfg.get('python-plugins', [])
        for module_name in module_names:
            module = __import__(module_name)
            module.init(root_dir=dep_cfg.root_dir)

def call_cmdline_tool(env_root, pkg_name):
    pkg_cfg = build_config(env_root, Bunch(name='dummy'))
    if pkg_name not in pkg_cfg.packages:
        print "This tool requires the '%s' package." % pkg_name
        sys.exit(1)
    cfg = pkg_cfg.packages[pkg_name]
    for dirname in resolve_dirs(cfg, cfg['python-lib']):
        sys.path.append(dirname)
    module_name = cfg.get('python-cmdline-tool')
    module = __import__(module_name)
    module.run()
