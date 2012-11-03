software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/16.0.2/runtimes/xulrunner-16.0.2.en-US.linux-x86_64.tar.bz2",
        "md5": "98c65ec440c4b4804878cd0e45f1d1e9",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "11e2e84de4d443da23234aa0bf86eb80"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/16.0.2/sdk/xulrunner-16.0.2.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "3dee83e7ef025563e39b52416f6d3f96",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner",
            "sig": "afc152d97ac6afa59303b47ed4102668"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/16.0.2/sdk/xulrunner-16.0.2.en-US.mac-i386.sdk.tar.bz2",
        "md5": "8484b13e8c1b5cb9116c531d20041b2c",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner",
            "sig": "947457da7d90bb8ada0673c27222b2ce"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/16.0.2/runtimes/xulrunner-16.0.2.en-US.win32.zip",
        "md5": "06a017719efb04c7d2e0e51dd1b5b3f1",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "d6bedcbc28b5f8661e3bded6e7547b02"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/16.0.2/runtimes/xulrunner-16.0.2.en-US.linux-i686.tar.bz2",
        "md5": "efbeb138bcb57341401daf3102a2b2bc",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "2e8084b2373b11302226c7cd372d51b7"
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
