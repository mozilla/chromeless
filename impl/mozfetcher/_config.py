software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/12.0/runtimes/xulrunner-12.0.en-US.linux-x86_64.tar.bz2",
        "md5": "2d5983649a0557f49a9606ad8f2fe8f0",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "21e4e3069cb9e71fbbc40752ad913848"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/12.0/sdk/xulrunner-12.0.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "4f18d0a830dd490afa1c6d39f8fafb21",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "8be281c79995c8263894c545bbe72ba6"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/12.0/sdk/xulrunner-12.0.en-US.mac-i386.sdk.tar.bz2",
        "md5": "e4d7f572e593c1cdb41bcb9102f22cd8",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "a2be32f3354793935a3b2a01efa11514"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/12.0/runtimes/xulrunner-12.0.en-US.win32.zip",
        "md5": "2efb8b6cfc48e085236a2512f9c3bf92",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "113450db2495b35b6a474de3ed9bee64"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/12.0/runtimes/xulrunner-12.0.en-US.linux-i686.tar.bz2",
        "md5": "60dcc4d24ddc202b7e2a629f31bb0e0c",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "21e4e3069cb9e71fbbc40752ad913848"
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
