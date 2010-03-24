import os
import unittest
import zipfile
import pprint

from cuddlefish import xpi
from cuddlefish.tests import test_packaging

xpi_template_path = os.path.join(test_packaging.static_files_path,
                                 'xpi-template')

fake_manifest = '<RDF><!-- Extension metadata is here. --></RDF>'

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

def normpath(path):
    """
    Make a platform-specific relative path use '/' as a separator.
    """

    return path.replace(os.path.sep, '/')

def document_zip_file(path):
    zip = zipfile.ZipFile(path, 'r')
    for name in zip.namelist():
        contents = zip.read(name)
        lines = contents.splitlines()
        if len(lines) == 1 and name.endswith('.json') and len(lines[0]) > 75:
            # Ideally we would json-decode this, but it results
            # in an annoying 'u' before every string literal,
            # since json decoding makes all strings unicode.
            contents = eval(contents)
            contents = pprint.pformat(contents)
            lines = contents.splitlines()
        contents = "\n  ".join(lines)
        print "%s:\n  %s" % (normpath(name), contents)
    zip.close()

def document_dir_files(path):
    for dirpath, dirnames, filenames in os.walk(path):
        relpath = dirpath[len(path)+1:]
        for filename in filenames:
            abspath = os.path.join(dirpath, filename)
            contents = open(abspath, 'r').read()
            contents = "\n  ".join(contents.splitlines())
            relfilename = os.path.join(relpath, filename)
            print "%s:" % normpath(relfilename)
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
