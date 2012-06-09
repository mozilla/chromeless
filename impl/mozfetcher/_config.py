software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0/runtimes/xulrunner-13.0.en-US.linux-x86_64.tar.bz2",
        "md5": "ea348400b32e879a320719cd393177bb",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "fbdbc9216b3a2e48f23fcd4ee5aa0f09"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0/sdk/xulrunner-13.0.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "ee70e730d56407ce1a970f39ba442722",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "ae8c9c6c4e09934f86d13d3f618f53d2"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0/sdk/xulrunner-13.0.en-US.mac-i386.sdk.tar.bz2",
        "md5": "732ec27dc82888a120045e92389e22ad",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "69cbc5165a2f3995a9affaae3776735b"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0/runtimes/xulrunner-13.0.en-US.win32.zip",
        "md5": "079f60ac7631fd01155b6bc7b898aeab",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "8760f832171e2acd6154cf2cdb18a8c0"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/13.0/runtimes/xulrunner-13.0.en-US.linux-i686.tar.bz2",
        "md5": "6f752fcc15e96155614903f0fb8f5b58",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "fbdbc9216b3a2e48f23fcd4ee5aa0f09"
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
