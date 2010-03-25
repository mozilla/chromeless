import os
import unittest

from cuddlefish import packaging
from cuddlefish.bunch import Bunch

tests_path = os.path.abspath(os.path.dirname(__file__))
static_files_path = os.path.join(tests_path, 'static-files')

def get_configs(pkg_name):
    pkg_path = os.path.join(static_files_path, 'packages', pkg_name)
    if not (os.path.exists(pkg_path) and os.path.isdir(pkg_path)):
        raise Exception('path does not exist: %s' % pkg_path)
    target_cfg = packaging.get_config_in_dir(pkg_path)
    pkg_cfg = packaging.build_config(static_files_path, target_cfg)
    deps = packaging.get_deps_for_targets(pkg_cfg, [pkg_name])
    build = packaging.generate_build_for_target(
        pkg_cfg=pkg_cfg,
        target=pkg_name,
        deps=deps,
        prefix='GUID-'
        )
    return Bunch(target_cfg=target_cfg, pkg_cfg=pkg_cfg, build=build)

class PackagingTests(unittest.TestCase):
    def test_basic(self):
        configs = get_configs('aardvark')
        packages = configs.pkg_cfg.packages

        self.assertTrue('jetpack-core' in packages)
        self.assertTrue('aardvark' in packages)
        self.assertTrue('jetpack-core' in packages.aardvark.dependencies)
        self.assertEqual(packages['jetpack-core'].loader, 'lib/loader.js')
        self.assertTrue(packages.aardvark.main == 'main')
