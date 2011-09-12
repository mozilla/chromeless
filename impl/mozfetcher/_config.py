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
        "url": "http://releases.mozilla.org/pub/mozilla.org/xulrunner/releases/6.0.2/sdk/xulrunner-6.0.2.en-US.mac-i386.sdk.tar.bz2",
        "md5": "a645c56fb9f3dacc8e7f96166bfb288d",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "fa285003839fd8e128b9a2171ca89757"
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
}

def getConfig(platform):
    for key in software:
        if type(key) is str:
            if platform == key:
                return software[key]
        elif platform in key:
            return software[key]
    raise RuntimeError("unsupported platform: " + platform)
