software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/runtimes/xulrunner-11.0.en-US.linux-x86_64.tar.bz2",
        "md5": "e477d76af746a720ffcf1ddbe0c8c8b8",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "2a5cfa5c3ab7d993e34d6079b80d1519"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/sdk/xulrunner-11.0.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "ff7d517399572f8b233707caaabbe7c7",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "e2188dc589505a0471b44e96fe581105"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/sdk/xulrunner-11.0.en-US.mac-i386.sdk.tar.bz2",
        "md5": "d2e1891f0588e8176b4b7f7ad9f56ec5",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "9b83b7b4d1462d3b222c7fc366aadd27"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/runtimes/xulrunner-11.0.en-US.win32.zip",
        "md5": "bb82f6769eeccdf78a3b526ab14a3501",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "19e10c8c9acb0ad715894989e14b012e"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/runtimes/xulrunner-11.0.en-US.linux-i686.tar.bz2",
        "md5": "3b1064cac2b547b8ac7d424b225f642c",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "2a5cfa5c3ab7d993e34d6079b80d1519"
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
