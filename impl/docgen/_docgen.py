import os
import copy
import shutil
import re

from cuddlefish import Bunch
import simplejson as json
import chromeless

from docstract import DocStract

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

    # iterate through each package and generate docs for it
    extractor = DocStract()

    apidocs = {}

    path_to_modules = os.path.join(chromeless.Dirs().cuddlefish_root, "modules")
    for pkg_name in os.listdir(path_to_modules):
        path = os.path.join(path_to_modules, pkg_name)
        oldPath = os.getcwd()
        os.chdir(path)

        isInternal = False
        if (pkg_name == "internal"):
            isInternal = True

        apidocs[pkg_name] = {
            "name": pkg_name
            }

        # now we'll walk the lib dir and generate documenation for each module
        for root, dirs, files in os.walk(path):
            for f in files:
                if f[-3:] == ".js":
                    # now get the lib/ relative path of this module
                    relpath = os.path.join(root,f)[len(path)+1:]
                    try:
                        moduleDocs = extractor.extractFromFile(relpath)
                        # insert module documentation into the great map
                        if not 'modules' in apidocs[pkg_name]:
                            apidocs[pkg_name]['modules'] = { }

                        apidocs[pkg_name]['modules'][moduleDocs['module']] = moduleDocs
                        apidocs[pkg_name]['modules'][moduleDocs['module']]["internal"] = isInternal

                    except Exception as e:
                        print "WARNING, skipping module due to malformed docs (%s/lib/%s):" % (pkg_name, relpath)
                        print "  %s" % re.sub("\n", " ", str(e))
                        pass

        os.chdir(oldPath)

    # add version number if available
    version = chromeless.version()
    if not version == None:
        apidocs["version"] = version

    apidocs_path = os.path.join(output_dir, 'apidocs.json')
    open(apidocs_path, 'w').write(json.dumps(apidocs, sort_keys=True, indent=2))
