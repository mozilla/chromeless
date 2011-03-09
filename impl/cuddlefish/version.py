import os

def get_version(env_root):
    f = open(os.path.join(env_root, ".version"), "r")
    sdk_version = f.read().strip()
    return sdk_version
