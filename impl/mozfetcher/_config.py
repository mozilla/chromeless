software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/14.0.1/runtimes/xulrunner-14.0.1.en-US.linux-x86_64.tar.bz2",
        "md5": "da461d364eda8842a86d353da747ce9b",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "17933253745b7636f542a8641e908907"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/14.0.1/sdk/xulrunner-14.0.1.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "4b8576fc29da7ae1411e2c508f7b45a0",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "45963475f9bf17a13b409d4d9dcd2141"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/14.0.1/sdk/xulrunner-14.0.1.en-US.mac-i386.sdk.tar.bz2",
        "md5": "592680517b940b3434b54b3e2f6f0473",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "5ddcbfab1eb7f5675285cf374b00b5bd"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/14.0.1/runtimes/xulrunner-14.0.1.en-US.win32.zip",
        "md5": "a0006d279dfdc89dbfcfdb741f3b4363",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "a8413934b428cf5ffd53cdd8ba57b3bc"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/14.0.1/runtimes/xulrunner-14.0.1.en-US.linux-i686.tar.bz2",
        "md5": "7ef38dd388b7e902e798825ed74cee5c",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "17933253745b7636f542a8641e908907"
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
