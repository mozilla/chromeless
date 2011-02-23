import os
import subprocess
from _dirs import Dirs 

__versionCache = None

def version():
    global __versionCache 
    if __versionCache:
        return __versionCache
    oldPath = os.getcwd()
    try:
        os.chdir(Dirs().cuddlefish_root)
        __versionCache = subprocess.check_output(["git", "log", "-1", r'--format=%h']).strip()
    except:
        pass
    finally:
        os.chdir(oldPath)
    return __versionCache
