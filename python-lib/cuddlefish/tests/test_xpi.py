import os
import unittest
import zipfile

import simplejson as json
from cuddlefish import xpi
from cuddlefish.tests import test_packaging

xpi_template_path = os.path.join(test_packaging.static_files_path,
                                 'xpi-template')

expected_xpi_files = [
    'install.rdf',
    'components/harness.js',
    'resources/testing-bar-lib/bar-module.js',
    'resources/testing-foo-lib/main.js',
    'resources/testing-jetpack-core-lib/loader.js',
    'harness-options.json'
    ]

expected_options = {
    u"main": u"main",
    u"resourcePackages": {
        u"testing-bar-lib": u"bar",
        u"testing-foo-lib": u"foo",
        u"testing-jetpack-core-lib": u"jetpack-core"
        },
    u"packageData": {},
    u"rootPaths": [u"resource://testing-jetpack-core-lib/",
                   u"resource://testing-bar-lib/",
                   u"resource://testing-foo-lib/"],
    u"resources": {
        u"testing-bar-lib": [u"resources", u"testing-bar-lib"],
        u"testing-foo-lib": [u"resources", u"testing-foo-lib"],
        u"testing-jetpack-core-lib": [u"resources",
                                      u"testing-jetpack-core-lib"]
        },
    u"loader": u"resource://testing-jetpack-core-lib/loader.js"
}

class XpiTests(unittest.TestCase):
    def test_basic(self):
        configs = test_packaging.get_configs('foo')
        options = {'main': configs.target_cfg.main}
        options.update(configs.build)
        xpiname = 'test-xpi.xpi'
        fake_manifest = '<RDF>This is a fake install.rdf.</RDF>'
        xpi.build_xpi(template_root_dir=xpi_template_path,
                      manifest=fake_manifest,
                      xpi_name=xpiname,
                      harness_options=options,
                      xpts=[])

        zip = zipfile.ZipFile(xpiname, 'r')
        self.assertEqual(zip.namelist(), expected_xpi_files)
        self.assertEqual(zip.read('install.rdf'), fake_manifest)
        self.assertEqual(json.loads(zip.read('harness-options.json')),
                         expected_options)
        zip.close()

        os.remove(xpiname)
