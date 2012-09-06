software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/15.0/runtimes/xulrunner-15.0.en-US.linux-x86_64.tar.bz2",
        "md5": "fe91993e176ef90bf6f0d716bc670e82",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "5db76b791f81a03b64cca1bcdbbb0f34"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/15.0/sdk/xulrunner-15.0.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "8aaf98e8599b27d69d6c6ef85d6728e9",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner",
            "sig": "d2f65b5e54188f896cab72b95d417a6b"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/15.0/sdk/xulrunner-15.0.en-US.mac-i386.sdk.tar.bz2",
        "md5": "b6a9b2e93f46f270a1f67bb060f04441",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner",
            "sig": "4cf93768fedfbaedab089bdd934d8e85"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/15.0/runtimes/xulrunner-15.0.en-US.win32.zip",
        "md5": "7212c58490a1546a046f05ebc9b52fe9",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "ee6e887692d695d0eb664ad23fa380a2"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/15.0/runtimes/xulrunner-15.0.en-US.linux-i686.tar.bz2",
        "md5": "c2e1fc39cdd5bc49cf991a71f8d5f151",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "a4f4424eda93e33f9cf5dfb95337e2be"
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
