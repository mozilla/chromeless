import os
import sys

import simplejson as json

METADATA_PROPS = ['name', 'description', 'keywords', 'author',
                  'contributors', 'license', 'url']

class MalformedJsonFileError(Exception):
    pass

def get_metadata(pkg_cfg, deps):
    metadata = {}
    for pkg_name in deps:
        cfg = pkg_cfg['packages'][pkg_name]
        metadata[pkg_name] = {}
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

def get_config_in_dir(path):
    package_json = os.path.join(path, 'package.json')
    data = open(package_json, 'r').read()
    try:
        base_json = json.loads(data)
    except ValueError, e:
        raise MalformedJsonFileError(package_json, str(e))

    if 'name' not in base_json:
        base_json['name'] = os.path.basename(path)

    for dirname in ['lib', 'tests', 'data', 'packages']:
        apply_default_dir(base_json, path, dirname)

    for key in ['lib', 'tests', 'dependencies', 'packages']:
        normalize_string_or_array(base_json, key)

    return base_json

def build_config(root_dir, extra_paths=None):
    paths = []

    def scan_package_dir(package_dir):
        package_paths = [os.path.join(package_dir, dirname)
                         for dirname in os.listdir(package_dir)]
        paths.extend(package_paths)

    packages_dir = os.path.join(root_dir, 'packages')
    if os.path.exists(packages_dir) and os.path.isdir(packages_dir):
        scan_package_dir(packages_dir)

    if not extra_paths:
        extra_paths = []
    paths.extend(extra_paths)

    paths = list(set([os.path.abspath(path) for path in paths]))
    packages = {}

    for path in paths:
        pkgconfig = get_config_in_dir(path)
        pkgconfig['root_dir'] = path

        # TODO: Ensure there are no namespace collisions.
        packages[pkgconfig['name']] = pkgconfig

        if 'packages' in pkgconfig:
            for package_dir in pkgconfig['packages']:
                scan_package_dir(os.path.join(path, package_dir))

    return {'paths': paths, 'packages': packages}

def get_deps_for_targets(pkg_cfg, targets):
    visited = []
    deps_left = list(targets)

    while deps_left:
        dep = deps_left.pop()
        if dep not in visited:
            visited.append(dep)
            # TODO: Raise a nicer error if dependency not found.
            dep_cfg = pkg_cfg['packages'][dep]
            deps_left.extend(dep_cfg.get('dependencies', []))

    return visited

def generate_build_for_target(pkg_cfg, target, deps, prefix='',
                              include_tests=True,
                              include_dep_tests=False):
    build = {'resources': {},
             'resourcePackages': {},
             'packageData': {},
             'rootPaths': []}

    def add_section_to_build(cfg, section, is_code=False,
                             is_data=False):
        if section in cfg:
            dirnames = cfg[section]
            if isinstance(dirnames, basestring):
                dirnames = [dirnames]
            for dirname in dirnames:
                name = "-".join([prefix + cfg['name'], dirname])
                build['resourcePackages'][name] = cfg['name']
                build['resources'][name] = os.path.join(cfg['root_dir'],
                                                        dirname)
                resource_url = 'resource://%s/' % name
                if is_code:
                    build['rootPaths'].insert(0, resource_url)
                if is_data:
                    build['packageData'][cfg['name']] = resource_url

    def add_dep_to_build(dep):
        dep_cfg = pkg_cfg['packages'][dep]
        add_section_to_build(dep_cfg, "lib", is_code=True)
        add_section_to_build(dep_cfg, "data", is_data=True)
        if include_tests and include_dep_tests:
            add_section_to_build(dep_cfg, "tests", is_code=True)
        if "loader" in dep_cfg:
            build['loader'] = "resource://%s-%s" % (prefix + dep,
                                                    dep_cfg["loader"])

    target_cfg = pkg_cfg['packages'][target]
    if include_tests and not include_dep_tests:
        add_section_to_build(target_cfg, "tests", is_code=True)

    for dep in deps:
        add_dep_to_build(dep)

    return build

def call_plugins(pkg_cfg, deps):
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
            module.init(root_dir=dep_cfg['root_dir'])
