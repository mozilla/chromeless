import os
import time
import threading
import socket
import urllib
import urllib2
import copy
import shutil
import traceback

from cuddlefish import packaging
from cuddlefish import Bunch
from cuddlefish import apiparser
from cuddlefish import apirenderer
import simplejson as json


class DocGen(object):
    def __init__(self, env_root, expose_privileged_api=True):
        self.env_root = env_root
        self.expose_privileged_api = expose_privileged_api
        self.root = os.path.join(self.env_root, 'docs')
        self.index = os.path.join(self.root, 'index.html')

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
    docgen = DocGen(env_root=env_root,
                    expose_privileged_api=False)

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

    # then copy docs from each package
    os.mkdir(os.path.join(output_dir, "packages"))

    pkg_cfg = docgen.build_pkg_cfg()

    # starting with the (generated) index file
    index = json.dumps(docgen.build_pkg_index(pkg_cfg))
    index_path = os.path.join(output_dir, "packages", 'index.json')
    open(index_path, 'w').write(index)

    # and every doc-like thing in the package
    pkgs = { }
    for pkg_name, pkg in pkg_cfg['packages'].items():
        pkgs[pkg_name] = pkg.root_dir
    print pkgs

    from _yuidoc_parse import DocParser 
    dp = DocParser(pkgs, ( "jsdoc", "js" ));
    print json.dumps(dp.data, indent=4)

        # dest_dir = os.path.join(output_dir, "packages", pkg_name)
        # if not os.path.exists(dest_dir):
        #     os.mkdir(dest_dir)

        # # TODO: This is a DRY violation from main.js. We should
        # # really move the common logic/names to cuddlefish.packaging.
        # src_readme = os.path.join(src_dir, "README.md")
        # if os.path.exists(src_readme):
        #     shutil.copyfile(src_readme,
        #                     os.path.join(dest_dir, "README.md"))

        # docs_src_dir = os.path.join(src_dir, "docs")
        # docs_dest_dir = os.path.join(dest_dir, "docs")
        # if not os.path.exists(docs_dest_dir):
        #     os.mkdir(docs_dest_dir)
        # for (dirpath, dirnames, filenames) in os.walk(docs_src_dir):
        #     assert dirpath.startswith(docs_src_dir)
        #     relpath = dirpath[len(docs_src_dir)+1:]
        #     for dirname in dirnames:
        #         dest_path = os.path.join(docs_dest_dir, relpath, dirname)
        #         if not os.path.exists(dest_path):
        #             os.mkdir(dest_path)
        #     for filename in filenames:
        #         if filename.endswith("~"):
        #             continue
        #         src_path = os.path.join(dirpath, filename)
        #         dest_path = os.path.join(docs_dest_dir, relpath, filename)
        #         shutil.copyfile(src_path, dest_path)
        #         if filename.endswith(".md"):
        #             # parse and JSONify the API docs
        #             docs_md = open(src_path, 'r').read()
        #             docs_parsed = list(apiparser.parse_hunks(docs_md))
        #             docs_json = json.dumps(docs_parsed)
        #             open(dest_path + ".json", "w").write(docs_json)
        #             # write the HTML div files
        #             docs_div = apirenderer.json_to_div(docs_parsed, src_path)
        #             open(dest_path + ".div.html", "w").write(docs_div)
        #             # write the standalone HTML files
        #             docs_html = apirenderer.json_to_html(docs_parsed, src_path)
        #             open(dest_path + ".html", "w").write(docs_html)
