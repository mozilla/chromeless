from __future__ import with_statement 
import platform
import os
import shutil
import chromeless
from string import Template
import simplejson as json
from _relpath import relpath

class Appifier(object):
    def __init__(self):
        # instanticate the proper OS-specific Appifier utility class
        s = platform.system()
        if s == 'Darwin':
            import _osx as osappifier
        elif s == 'Linux':
            import _linux as osappifier
        elif s == 'Windows':
            import _win32 as osappifier

        self.osappifier = osappifier.OSAppifier()
        self.dirs = chromeless.Dirs()

    def _sub_and_copy(self, src, dst, mapping):
        template_content = ""
        with open(src, 'r') as f:
            template_content = f.read()
        s = Template(template_content)
        final_contents = s.substitute(mapping)
        with open(dst, 'w') as f:
            f.write(final_contents)

    # generate a complete standalone application (inside of a folder)
    # the output will be placed in build/ directory and the path to the
    # application will be returned
    def output_application(self, browser_code, harness_options, dev_mode,
                           verbose=True):
        browser_code_dir = browser_code
        browser_code_main = "index.html"
        if not os.path.isdir(browser_code_dir):
            browser_code_main = os.path.basename(browser_code)
            browser_code_dir = os.path.dirname(browser_code)

        # generate the application shell, returning the parameters of its creation
        # (like, the directory it was output into, and where inside that bundle the
        # xulrunner application files should be put)
        params = self.osappifier.output_app_shell(browser_code_dir=browser_code_dir,
                                                  dev_mode=dev_mode)

        # now generate the xulrunner app, outputing inside the shell generated above
        self.output_xul_app(browser_code=browser_code,
                            dev_mode=dev_mode,
                            harness_options=harness_options,
                            output_dir=params["xulrunner_app_dir"])

        return params['output_dir']

    def _recursive_copy_or_link(self, try_link, src, dst):
        IGNORED_FILES = [".gitignore", ".hgignore", "install.rdf"]
        IGNORED_FILE_SUFFIXES = ["~", ".test.js"]
        IGNORED_DIRS = [".svn", ".hg", "defaults", ".git"]

        os.makedirs(dst)

        def filter_filenames(filenames):
            for filename in filenames:
                if filename in IGNORED_FILES:
                    continue
                if any([filename.endswith(suffix)
                        for suffix in IGNORED_FILE_SUFFIXES]):
                    continue
                yield filename


        if try_link and platform.system() != 'Windows':
            for f in os.listdir(src):
                if (f in IGNORED_DIRS or f in IGNORED_FILES or
                    any([f.endswith(suffix) for suffix in IGNORED_FILE_SUFFIXES])):
                    continue
                os.symlink(os.path.join(src, f), os.path.join(dst, f))
        else:
            for dirpath, dirnames, filenames in os.walk(src):
                goodfiles = list(filter_filenames(filenames))
                tgt_dir = dst
                if dirpath != src:
                    tgt_dir = os.path.join(tgt_dir, relpath(dirpath, src))
                if not os.path.isdir(tgt_dir):
                    os.makedirs(tgt_dir)
                for filename in goodfiles:
                    shutil.copy(os.path.join(dirpath, filename), os.path.join(tgt_dir, filename))
                dirnames[:] = [dirname for dirname in dirnames if dirname not in IGNORED_DIRS]

    # generate a xul application (a directory with application.ini and other stuff)
    # the application will be placed in the build/ directory and the path to it
    # will be returned
    def output_xul_app(self, browser_code, harness_options, dev_mode,
                       verbose=True, output_dir=None):
        browser_code_dir = browser_code
        browser_code_main = "index.html"
        if not os.path.isdir(browser_code_dir):
            browser_code_main = os.path.basename(browser_code)
            browser_code_dir = os.path.dirname(browser_code)

        # determine where to put the app, if the output_dir is not
        # specified we'll put the app output in build/ and remove
        # pre-existing output, otherwise we'll write into the location
        # and hope for the best.
        if output_dir == None:
            app_info = chromeless.AppInfo(dir=browser_code_dir)
            output_dir = os.path.join(self.dirs.build_dir, app_info.name) + ".xul"
            if os.path.exists(output_dir):
                if verbose:
                    print "Removing old xul app"
                shutil.rmtree(output_dir)

        if not os.path.isdir(output_dir):
            os.makedirs(output_dir)

        if verbose:
            print "Building xulrunner app in >%s< ..." % output_dir 

        # extract information about the application from appinfo.json
        app_info = chromeless.AppInfo(dir=browser_code_dir)

        res_dir = os.path.join(os.path.dirname(__file__), "resources")

        # copy all the template files which require no substitution
        template_dir = os.path.join(res_dir, "xulrunner.template")
        if verbose:
            print "  ... copying application template"

        for f in os.listdir(template_dir):
            src = os.path.join(template_dir, f)
            dst = os.path.join(output_dir, f)
            if (os.path.isdir(src)):
                shutil.copytree(src, dst)
            else:
                shutil.copy(src, dst)

        # sub in application.ini
        if verbose:
            print "  ... creating application.ini"

        app_ini_template = os.path.join(res_dir, "application.ini.template")
        app_ini_path = os.path.join(output_dir, "application.ini")

        self._sub_and_copy(app_ini_template, app_ini_path, {
                "application_name": app_info.name,
                "application_vendor": app_info.vendor,
                "short_version": app_info.version,
                "build_id": app_info.build_id,
                "developer_email": app_info.developer_email
        })

        # now copy in required packages (and update harness options with new pathing
        # as we go)
        if verbose:
            print "  ... copying in CommonJS packages"

        pkg_tgt_dir = os.path.join(output_dir, "packages")

        new_resources = {}
        for resource in harness_options['resources']:
            base_arcpath = os.path.join('packages', resource)
            new_resources[resource] = ['packages', resource]
            abs_dirname = harness_options['resources'][resource]
            # Always create the directory, even if it contains no files,
            # since the harness will try to access it.
            res_tgt_dir = os.path.join(pkg_tgt_dir, resource)

            # in development mode we'll create symlinks.  otherwise we'll
            # recursively copy over required packages and filter out temp files
            self._recursive_copy_or_link(try_link=dev_mode,
                                         src=abs_dirname,
                                         dst=res_tgt_dir)

        harness_options['resources'] = new_resources

        # and browser code
        if verbose:
            print "  ... copying in browser code (%s)" % browser_code_dir 
        self._recursive_copy_or_link(try_link=dev_mode,
                                     src=browser_code_dir,
                                     dst=os.path.join(output_dir, "browser_code"))

        # now re-write appinfo
        if verbose:
            print "  ... writing application info file"

        with open(os.path.join(output_dir, "browser_code", "appinfo.json"), 'w') as f:
            f.write(json.dumps(app_info.object, indent=4))

        # now munge harness_options a bit to get correct path to browser_code in
        browser_code_path = "browser_code"
        if browser_code_main:
            browser_code_path = os.path.join(browser_code_path, browser_code_main)

        static_opts = harness_options['staticArgs']
        static_opts["browser"] = browser_code_path

        # and write harness options
        if verbose:
            print "  ... writing harness options"

        with open(os.path.join(output_dir, "harness-options.json"), 'w') as f:
            f.write(json.dumps(harness_options, indent=4))

        # XXX: support for extra packages located outside of the packages/ directory!

        if verbose:
            print "xul app generated in %s" % relpath(output_dir, self.dirs.cuddlefish_root) 
        return output_dir
