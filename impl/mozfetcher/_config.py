import os,chromeless

software = {
    "Linux_64bit": {
       "url": "http://releases.mozilla.org/pub/mozilla.org/xulrunner/releases/2.0/runtimes/xulrunner-2.0.en-US.linux-x86_64.tar.bz2",
       "md5": "cb0dc6ff5304b325098fc8910057884f",
       "bin": {
           "path": "xulrunner/xulrunner",
           "sig": "d103f16afe6a6125bb28987a9e391fee"
       }
    },
    # for both 32 and 64 bit darwin we'll use 32 bit binaries
    ( "Darwin_64bit", "Darwin_32bit" ): {
        "url": "http://releases.mozilla.org/pub/mozilla.org/xulrunner/releases/2.0/sdk/xulrunner-2.0.en-US.mac-i386.sdk.tar.bz2",
        "md5": "cf56e216a05feed16cb290110fd89802",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "ec043427ca789950bf388db3cf88c7cf"
        }
    },
    ( "Windows_32bit", "Windows_64bit" ): {
        "url": "http://releases.mozilla.org/pub/mozilla.org/xulrunner/releases/2.0/runtimes/xulrunner-2.0.en-US.win32.zip",
        "md5": "38e5c5ad08927278ed6c333aef836882",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "0910106650f397e67aa52f4c4d924f8e"
        }
    },
    "Linux_32bit": {
        "url": "http://releases.mozilla.org/pub/mozilla.org/xulrunner/releases/2.0/runtimes/xulrunner-2.0.en-US.linux-i686.tar.bz2",
        "md5": "5acef7cc816691f5c8726731ee0d8bdf",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "d103f16afe6a6125bb28987a9e391fee"
        }
    }
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
