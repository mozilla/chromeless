import os
import copy
import shutil
import re

from cuddlefish import packaging
from cuddlefish import Bunch
import simplejson as json

from _extract import DocExtractor

class DocGen(object):
    def __init__(self, env_root):
        self.env_root = env_root
        self.root = os.path.join(self.env_root, 'docs')

    def _get_files_in_dir(self, path):
        data = {}
        files = os.listdir(path)
        for filename in files:
            fullpath = os.path.join(path, filename)
            if os.path.isdir(fullpath):
                data[filename] = self._get_files_in_dir(fullpath)
            else:
                try:
                    info = os.stat(fullpath)
                    data[filename] = dict(size=info.st_size)
                except OSError:
                    pass
        return data

    def build_pkg_index(self, pkg_cfg):
        pkg_cfg = copy.deepcopy(pkg_cfg)
        for pkg in pkg_cfg.packages:
            root_dir = pkg_cfg.packages[pkg].root_dir
            files = self._get_files_in_dir(root_dir)
            pkg_cfg.packages[pkg].files = files
            del pkg_cfg.packages[pkg].root_dir
        return pkg_cfg.packages

    def build_pkg_cfg(self):
        pkg_cfg = packaging.build_config(self.env_root,
                                         Bunch(name='dummy'))
        del pkg_cfg.packages['dummy']
        return pkg_cfg


def generate_static_docs(env_root, output_dir):
    docgen = DocGen(env_root=env_root)

    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)

    # first, copy static-files
    shutil.copytree(docgen.root, output_dir)
    # py2.5 doesn't have ignore=, so we delete tempfiles afterwards. If we
    # required >=py2.6, we could use ignore=shutil.ignore_patterns("*~")
    for (dirpath, dirnames, filenames) in os.walk(output_dir):
        for n in filenames:
            if n.endswith("~"):
                os.unlink(os.path.join(dirpath, n))

    # Now let's generate documentation
    os.mkdir(os.path.join(output_dir, "packages"))
    pkg_cfg = docgen.build_pkg_cfg()

    # iterate through each package and generate docs for it
    extractor = DocExtractor()

    apidocs = {}
    for pkg_name, pkg in pkg_cfg['packages'].items():
        path = os.path.join(pkg.root_dir, "lib")
        oldPath = os.getcwd()
        os.chdir(path)

        apidocs[pkg_name] = {
            "name": pkg_name
            }
        if 'description' in pkg:
            apidocs[pkg_name]['desc'] = pkg.description 

        # now we'll walk the lib dir and generate documenation for each module
        for root, dirs, files in os.walk(path):
            for f in files:
                if f[-3:] == ".js":
                    # now get the lib/ relative path of this module
                    relpath = os.path.join(root,f)[len(path)+1:]
                    try:
                        moduleDocs = extractor.extract(relpath)
                        # insert module documentation into the great map
                        if not 'modules' in apidocs[pkg_name]:
                            apidocs[pkg_name]['modules'] = { }

                        apidocs[pkg_name]['modules'][moduleDocs['module']] = moduleDocs

                    except Exception as e:
                        print "WARNING, skipping module due to malformed docs (%s/lib/%s):" % (pkg_name, relpath)
                        print "  %s" % re.sub("\n", " ", str(e))
                        pass

        os.chdir(oldPath)

    apidocs_path = os.path.join(output_dir, "packages", 'apidocs.json')
    open(apidocs_path, 'w').write(json.dumps(apidocs, sort_keys=True, indent=2))
