import os,chromeless

software = {
    "default": { "bin": { "path": os.path.join(chromeless.Dirs().cuddlefish_root, "xulrunner") } }
}

def getConfig(platform):
    for key in software:
        if type(key) is str:
            if platform == key:
                return software[key]
        elif platform in key:
            return software[key]
    if "default" in software:
            return software["default"]
    raise RuntimeError("unsupported platform: " + platform)
