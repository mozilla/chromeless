import chromeless
import os
import shutil
from string import Template

class OSAppifier(object):
    def __init__(self):
        # instantiate a dirs object which has some important directories
        # as properties
        self.dirs = chromeless.Dirs()

        print "OSAppifier initialized"
        
    def output_xulrunner_app(self, dir, browser_code_dir, browser_code_main, dev_mode):
        print "output_xulrunner_app called"        


    def output_app_shell(self, browser_code_dir, dev_mode, verbose=True):
        # first, determine the application name
        app_info = chromeless.AppInfo(dir=browser_code_dir)
        output_dir = os.path.join(self.dirs.build_dir, app_info.name) + ".app"

        if verbose:
            print "Building application in >%s< ..." % output_dir 

        # obliterate old directory if present
        if os.path.exists(output_dir):
            if verbose:
                print "  ... removing previous application"
            shutil.rmtree(output_dir)

        # now let's mock up a XUL.framework dir
        framework_dir = os.path.join(output_dir, "Contents", "Frameworks", "XUL.framework")
        os.makedirs(framework_dir)
        
        # create the current version dir
        cur_ver_dir = os.path.join(framework_dir, "Versions")
        os.makedirs(cur_ver_dir)
        cur_ver_dir = os.path.join(cur_ver_dir, "Current")
        xul_bin_src = os.path.join(self.dirs.build_dir, "xulrunner-sdk", "bin")

        # and recursivly copy in the bin/ directory out of the sdk 
        if verbose:
            print "  ... copying in xulrunner binaries"
        shutil.copytree(xul_bin_src, cur_ver_dir)

        # create links inside framework
        for f in ("XUL", "xulrunner-bin", "libxpcom.dylib"):
            tgt = os.path.relpath(os.path.join(cur_ver_dir, f), framework_dir)
            os.symlink(tgt, os.path.join(framework_dir, f))

        # now it's time to write a parameterized Info.plist
        if verbose:
            print "  ... writing Info.plist"
        info_plist_path = os.path.join(output_dir, "Contents", "Info.plist")
        template_path = os.path.join(os.path.dirname(__file__), "resources", "Info.plist.template")
        template_content = ""
        with open(template_path, 'r') as f:
            template_content = f.read()

        s = Template(template_content)
        info_plist_contents = s.substitute(application_name=app_info.name,
                                           short_version=app_info.version,
                                           full_version=app_info.long_version)

        with open(info_plist_path, 'w') as f:
            f.write(info_plist_contents)

        # we'll create the MacOS (binary) dir and copy over the xulrunner binary
        if verbose:
            print "  ... placing xulrunner binary"

        macos_dir = os.path.join(output_dir, "Contents", "MacOS")
        os.makedirs(macos_dir)
        xulrunner_stub_path = os.path.join(cur_ver_dir, "xulrunner")
        shutil.copy(xulrunner_stub_path, macos_dir)

        # Finally, create the resources dir (where the xulrunner application will live
        if verbose:
            print "  ... creating resources directory"
        resources_path = os.path.join(output_dir, "Contents", "Resources")
        os.makedirs(resources_path)

        return { "xulrunner_app_dir": resources_path } 
