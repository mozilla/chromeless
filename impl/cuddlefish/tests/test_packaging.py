import os
import unittest

from cuddlefish import packaging
from cuddlefish.bunch import Bunch

tests_path = os.path.abspath(os.path.dirname(__file__))
static_files_path = os.path.join(tests_path, 'static-files')

def get_configs(pkg_name, dirname='static-files'):
    root_path = os.path.join(tests_path, dirname)
    pkg_path = os.path.join(root_path, 'packages', pkg_name)
    if not (os.path.exists(pkg_path) and os.path.isdir(pkg_path)):
        raise Exception('path does not exist: %s' % pkg_path)
    target_cfg = packaging.get_config_in_dir(pkg_path)
    pkg_cfg = packaging.build_config(root_path, target_cfg)
    deps = packaging.get_deps_for_targets(pkg_cfg, [pkg_name])
    build = packaging.generate_build_for_target(
        pkg_cfg=pkg_cfg,
        target=pkg_name,
        deps=deps,
        prefix='guid-'
        )
    return Bunch(target_cfg=target_cfg, pkg_cfg=pkg_cfg, build=build)

class PackagingTests(unittest.TestCase):
    def test_bug_588661(self):
        configs = get_configs('foo', 'bug-588661-files')
        self.assertEqual(configs.build.loader,
                         'resource://guid-foo-lib/foo-loader.js')

    def test_basic(self):
        configs = get_configs('aardvark')
        packages = configs.pkg_cfg.packages

        self.assertTrue('api-utils' in packages)
        self.assertTrue('aardvark' in packages)
        self.assertTrue('api-utils' in packages.aardvark.dependencies)
        self.assertEqual(packages['api-utils'].loader, 'lib/loader.js')
        self.assertTrue(packages.aardvark.main == 'main')
