import os
import sys

import simplejson as json

METADATA_PROPS = ['name', 'description', 'keywords', 'author',
                  'contributors']

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

def get_config_in_dir(path):
    package_json = os.path.join(path, 'package.json')
    data = open(package_json, 'r').read()
    try:
        return json.loads(data)
    except ValueError, e:
        raise MalformedJsonFileError(package_json, str(e))

def build_config(root_dir, extra_paths=None):
    packages_dir = os.path.join(root_dir, 'packages')
    config = {'paths': []}
    if os.path.exists(packages_dir) and os.path.isdir(packages_dir):
        package_paths = [os.path.join(packages_dir, dirname)
                         for dirname in os.listdir(packages_dir)]
        config['paths'].extend(package_paths)

    if not extra_paths:
        extra_paths = []
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

def get_deps_for_targets(pkg_cfg, targets):
    visited = []
    deps_left = list(targets)

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
