import sys
import os
import shutil
import fnmatch
import subprocess
import distutils.dir_util

from bunch import Bunch

def clear_dir(dirname):
    if os.path.exists(dirname) and os.path.isdir(dirname):
        shutil.rmtree(dirname)

def run_program(args, **kwargs):
    retval = subprocess.call(args, **kwargs)
    if retval:
        print "Process failed with exit code %d." % retval
        sys.exit(retval)

def build_xpcom_components(comp_src_dir, moz_srcdir, moz_objdir,
                           base_output_dir, xpt_output_dir, module_name):
    options = Bunch(srcdir=moz_srcdir,
                    objdir=moz_objdir)
    xpcom_info = Bunch()

    autoconf = open(os.path.join(options.objdir, "config", "autoconf.mk"),
                    "r").readlines()
    for line in autoconf:
        if line.startswith("OS_TARGET"):
            xpcom_info.os = line.split("=")[1].strip()
        elif line.startswith("LIBXUL_SDK"):
            xpcom_info.libxul = line.split("=")[1].strip()
            if sys.platform.startswith('win'):
                # The path is mingw-style, convert it to windows-style.
                sh_echo = subprocess.Popen(["sh", "-c",
                                            "cmd //c echo " +
                                            xpcom_info.libxul],
                                           stdout=subprocess.PIPE)
                sh_echo.wait()
                xpcom_info.libxul = sh_echo.stdout.read().strip()
        elif line.startswith("TARGET_XPCOM_ABI"):
            xpcom_info.abi = line.split("=")[1].strip()
        elif line.startswith("MOZILLA_VERSION"):
            xpcom_info.mozilla_version = line.split("=")[1].strip()[:5]
        elif (line.startswith("MOZ_DEBUG") and
              not line.startswith("MOZ_DEBUG_")):
            raw_value = line.split("=")[1].strip()
            if not raw_value:
                xpcom_info.is_debug = 0
            else:
                xpcom_info.is_debug = int(raw_value)

    platform = "%(os)s_%(abi)s" % xpcom_info
    print "Building XPCOM binary components for %s" % platform

    rel_dest_dir = os.path.join("browser", "components", module_name)
    comp_dest_dir = os.path.join(options.srcdir, rel_dest_dir)
    comp_xpi_dir = os.path.join(options.objdir, "dist", "xpi-stage",
                                module_name, "components")
    comp_plat_dir = os.path.join(base_output_dir,
                                 platform, xpcom_info.mozilla_version)

    clear_dir(comp_dest_dir)
    clear_dir(comp_xpi_dir)

    shutil.copytree(comp_src_dir, comp_dest_dir)

    # Ensure that these paths are unix-like on Windows.
    sh_pwd = subprocess.Popen(["sh", "-c", "pwd"],
                              cwd=options.srcdir,
                              stdout=subprocess.PIPE)
    sh_pwd.wait()
    unix_topsrcdir = sh_pwd.stdout.read().strip()
    unix_rel_dest_dir = rel_dest_dir.replace("\\", "/")

    # We're specifying 'perl' here because we have to for this
    # to work on Windows.
    run_program(["perl",
                 os.path.join(options.srcdir, "build", "autoconf",
                              "make-makefile"),
                 "-t", unix_topsrcdir,
                 unix_rel_dest_dir],
                cwd=options.objdir)

    env = {}
    env.update(os.environ)

    run_program(["make"],
                cwd=os.path.join(options.objdir, rel_dest_dir),
                env=env)

    xptfiles = []
    libfiles = []
    for filename in os.listdir(comp_xpi_dir):
        if fnmatch.fnmatch(filename, '*.xpt'):
            xptfiles.append(filename)
        else:
            libfiles.append(filename)

    clear_dir(comp_plat_dir)
    distutils.dir_util.mkpath(comp_plat_dir)
    for filename in libfiles:
        shutil.copy(os.path.join(comp_xpi_dir, filename),
                    comp_plat_dir)

    for filename in xptfiles:
        shutil.copy(os.path.join(comp_xpi_dir, filename),
                    xpt_output_dir)

    print "NO"
    sys.exit(1)
