software = {
    "Linux_64bit": {
       "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/6.0.2/runtimes/xulrunner-6.0.2.en-US.linux-x86_64.tar.bz2",
       "md5": "a1e98013cbb4d9685461465e09b3c7c7",
       "bin": {
           "path": "xulrunner/xulrunner",
           "sig": "e473d9a27a10b9bf1ffb1bd8a3e6d668"
       }
    },
    # for both 32 and 64 bit darwin we'll use 32 bit binaries
    ( "Darwin_64bit", "Darwin_32bit" ): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/6.0.2/sdk/xulrunner-6.0.2.en-US.mac-i386.sdk.tar.bz2",
        "md5": "a645c56fb9f3dacc8e7f96166bfb288d",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "fa285003839fd8e128b9a2171ca89757"
        }
    },
    ( "Windows_32bit", "Windows_64bit" ): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/6.0.2/runtimes/xulrunner-6.0.2.en-US.win32.zip",
        "md5": "173502a8f48d8eb74baa9c7326d91733",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "0f7b375432357138ff6a1127d54a8403"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/6.0.2/runtimes/xulrunner-6.0.2.en-US.linux-i686.tar.bz2",
        "md5": "b348164d69ab9d1b226e98a4893029f2",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "e473d9a27a10b9bf1ffb1bd8a3e6d668"
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
