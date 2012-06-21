software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0.1/runtimes/xulrunner-13.0.1.en-US.linux-x86_64.tar.bz2",
        "md5": "cab16e288085f82b4a20c86f96e47cc9",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "142eff9ce0db666e960b5d538ed7bc62"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0.1/sdk/xulrunner-13.0.1.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "a9b3847b3fa644d9d57198fb4cafe967",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "decef764f4a0dc2ee8754dfa6eefe12e"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0.1/sdk/xulrunner-13.0.1.en-US.mac-i386.sdk.tar.bz2",
        "md5": "4472a3265b332c2d0066d316e739a3ae",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "5c317cd130023e903a4e09323bc666fd"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0.1/runtimes/xulrunner-13.0.1.en-US.win32.zip",
        "md5": "006a7049ab1b1bca81fcd19bfd06e3e5",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "875922b027dcf40bb6d70804b5fb1d12"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0.1/runtimes/xulrunner-13.0.1.en-US.linux-i686.tar.bz2",
        "md5": "d58585e18fff3f6da9f73a88e7593383",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "142eff9ce0db666e960b5d538ed7bc62"
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
