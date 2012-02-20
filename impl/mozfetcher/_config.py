software = {
    "Linux_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/10.0.2/runtimes/xulrunner-10.0.2.en-US.linux-x86_64.tar.bz2",
        "md5": "979bff08a53b7137638771026fdab256",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "c90158d7dbd71842b1836b0c1439f04a"
        }
    },
    "Darwin_64bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/10.0.2/sdk/xulrunner-10.0.2.en-US.mac-x86_64.sdk.tar.bz2",
        "md5": "af902d3517e454baee24249fef0fc4f0",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "6d2eacb965a87f15bcd76bf6b9df405a"
        }
    },
    "Darwin_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/10.0.2/sdk/xulrunner-10.0.2.en-US.mac-i386.sdk.tar.bz2",
        "md5": "274bcfbf9236c38f0cd41373ea92e464",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "855285f06588fc9a86bfdce70e352244"
        }
    },
    ("Windows_32bit", "Windows_64bit"): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/10.0.2/runtimes/xulrunner-10.0.2.en-US.win32.zip",
        "md5": "084d8c52645787bdcdbc7b1511ac805c",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "42dfaf59ec4d8a60949ac73222597790"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/10.0.2/runtimes/xulrunner-10.0.2.en-US.linux-i686.tar.bz2",
        "md5": "5da169ed3888453de4540c01ebabc4c0",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "c90158d7dbd71842b1836b0c1439f04a"
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
