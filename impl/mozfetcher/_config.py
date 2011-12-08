software = {
    "Linux_64bit": {
       "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/8.0/runtimes/xulrunner-8.0.en-US.linux-x86_64.tar.bz2",
       "md5": "206048595f9a117f8ef73bc9029664c1",
       "bin": {
           "path": "xulrunner/xulrunner",
           "sig": "99abcb7bc5799f728aac4d028dc4887f"
       }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/8.0/sdk/xulrunner-8.0.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "10e1f7fdfc577198d783527e5129cb8a",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "c83fde208c9125651858960e293ff439"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/8.0/sdk/xulrunner-8.0.en-US.mac-i386.sdk.tar.bz2",
        "md5": "32ba192b61762fd164b2c4973b2c5847",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "5007e4b937ef4ed18b9bcdcda9cb763e"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/8.0/runtimes/xulrunner-8.0.en-US.win32.zip",
        "md5": "e07c9497ad10f485b6d0a8d550cbd1fd",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "cbd7d06bce31ee402c88f140a8294c13"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/8.0/runtimes/xulrunner-8.0.en-US.linux-i686.tar.bz2",
        "md5": "779895f135e5b32a7d8053287b640d3c",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "99abcb7bc5799f728aac4d028dc4887f"
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
