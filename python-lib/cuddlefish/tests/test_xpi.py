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

fake_manifest = '<RDF>This is a fake install.rdf.</RDF>'

def document_dir(name):
    if name in ['packages', 'xpi-template']:
        dirname = os.path.join(test_packaging.static_files_path, name)
        document_dir_files(dirname)
    elif name == 'xpi-output':
        create_xpi('test-xpi.xpi')
        document_zip_file('test-xpi.xpi')
        os.remove('test-xpi.xpi')
    else:
        raise Exception('unknown dir: %s' % name)

def document_zip_file(path):
    zip = zipfile.ZipFile(path, 'r')
    for name in zip.namelist():
        contents = zip.read(name)
        lines = contents.splitlines()
        if len(lines) == 1 and name.endswith('.json') and len(lines[0]) > 75:
            import pprint
            contents = pprint.pformat(json.loads(contents), width=50)
            lines = contents.splitlines()
        contents = "\n  ".join(lines)
        print "%s:\n  %s" % (name, contents)
    zip.close()

def document_dir_files(path):
    for dirpath, dirnames, filenames in os.walk(path):
        relpath = dirpath[len(path)+1:]
        for filename in filenames:
            abspath = os.path.join(dirpath, filename)
            contents = open(abspath, 'r').read()
            contents = "\n  ".join(contents.splitlines())
            relfilename = os.path.join(relpath, filename)
            print "%s:" % relfilename
            print "  %s" % contents

def create_xpi(xpiname):
    configs = test_packaging.get_configs('foo')
    options = {'main': configs.target_cfg.main}
    options.update(configs.build)
    xpi.build_xpi(template_root_dir=xpi_template_path,
                  manifest=fake_manifest,
                  xpi_name=xpiname,
                  harness_options=options,
                  xpts=[])

class XpiTests(unittest.TestCase):
    def test_basic(self):
        xpiname = 'test-xpi.xpi'
        create_xpi(xpiname)

        zip = zipfile.ZipFile(xpiname, 'r')
        self.assertEqual(zip.namelist(), expected_xpi_files)
        self.assertEqual(zip.read('install.rdf'), fake_manifest)
        self.assertEqual(json.loads(zip.read('harness-options.json')),
                         expected_options)
        zip.close()

        os.remove(xpiname)
