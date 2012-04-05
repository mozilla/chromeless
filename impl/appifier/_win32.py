import chromeless
import os
import shutil
from string import Template
import simplejson as json
import platform

class OSAppifier(object):
    def __init__(self):
        # instantiate a dirs object which has some important directories
        # as properties
        self.dirs = chromeless.Dirs()

    def output_app_shell(self, browser_code_dir, dev_mode, verbose=True):
        # first, determine the application name
        app_info = chromeless.AppInfo(dir=browser_code_dir)
        output_dir = os.path.join(self.dirs.build_dir, app_info.name)

        if verbose:
            print "Building application in >%s< ..." % output_dir 

        # obliterate old directory if present
        if os.path.exists(output_dir):
            if verbose:
                print "  ... removing previous application"
            shutil.rmtree(output_dir)

        os.makedirs(output_dir)

        # create the current version dir
        xul_src = os.path.join(self.dirs.build_dir, "xulrunner")
        xul_dst = os.path.join(output_dir, "xulrunner")

        # and recursivly copy in the bin/ directory out of the sdk 
        if verbose:
            print "  ... copying in xulrunner binaries"
        shutil.copytree(xul_src, xul_dst)

        # we'll copy over the xulrunner-stub.exe binary to the top leve
        if verbose:
            print "  ... placing xulrunner binary"

        xulrunner_stub_path = os.path.join(output_dir, "xulrunner", "xulrunner-stub.exe")
        final_binary_path = os.path.join(output_dir, app_info.name + ".exe")
        shutil.copy(xulrunner_stub_path,  final_binary_path)

        # With XULRunner 11.0 you may need to copy "gkmedias.dll" from the 
        # xulrunner directory to the root directory
        # See https://developer.mozilla.org/en/XULRunner/Deploying_XULRunner_1.8
        dllsrc = os.path.join(output_dir, "xulrunner", "gkmedias.dll")
        shutil.move(dllsrc, output_dir)

        return { "xulrunner_app_dir": output_dir, "output_dir": output_dir } 
