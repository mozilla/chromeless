software = {
    "Linux_64bit": {
       "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/9.0.1/runtimes/xulrunner-9.0.1.en-US.linux-x86_64.tar.bz2",
       "md5": "7c17387c257989c1d619d9e7e9dde3fd",
       "bin": {
           "path": "xulrunner/xulrunner",
           "sig": "86b820761b388fb33f24d1e791202200"
       }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/9.0.1/sdk/xulrunner-9.0.1.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "040efe15ea98e76060f97237092c86bc",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "b1a0e84077b4fda3b4048a80cb148d8b"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/9.0.1/sdk/xulrunner-9.0.1.en-US.mac-i386.sdk.tar.bz2",
        "md5": "2cb51b90bf15142d5050bdf7bd4f7057",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "940349855ef5ad0c84edfccd051283cc"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/9.0.1/runtimes/xulrunner-9.0.1.en-US.win32.zip",
        "md5": "cb7af1bc5e49a5bacbe6ed80669d3980",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "79f2e15f8029d35c3614eab024af6816"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/9.0.1/runtimes/xulrunner-9.0.1.en-US.linux-i686.tar.bz2",
        "md5": "7ed8aa5dde71f80381a4bc7cb1f92969",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "86b820761b388fb33f24d1e791202200"
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
