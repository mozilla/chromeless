software = {
    "Linux_64bit": {
       "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/latest-trunk/xulrunner-2.0b7pre.en-US.linux-x86_64.tar.bz2",
       "md5": "1c735b4e478f83b674a8cde834011e29",
       "bin": {
           "path": "xulrunner/xulrunner",
           "sig": "daf246fc716772e9031938ee50d610cf"
       }
    },
    # for both 32 and 64 bit darwin we'll use 32 bit binaries
    ( "Darwin_64bit", "Darwin_32bit" ): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/latest-trunk/xulrunner-2.0b7pre.en-US.mac-i386.sdk.tar.bz2",
        "md5": "133c4263a070d0d4ea26ca1f346b8e4a",
        "bin": {
            "path": "xulrunner-sdk/bin/xulrunner-bin",
            "sig": "be5a6300da9e5cfc7973255e68f940af"
        }
    },
    ( "Windows_32bit", "Windows_64bit" ): {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/latest-trunk/xulrunner-2.0b7pre.en-US.win32.zip",
        "md5": "318653c4952f0e6f0e58db0c548730f6",
        "bin": {
            "path": "xulrunner/xulrunner.exe",
            "sig": "d0bba60461148617cc73cdf86e438198"
        }
    },
    "Linux_32bit": {
        "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/latest-trunk/xulrunner-2.0b7pre.en-US.linux-i686.tar.bz2",
        "md5": "64e11cb6c02d9a1d2932e3fb47080e1d",
        "bin": {
            "path": "xulrunner/xulrunner",
            "sig": "daf246fc716772e9031938ee50d610cf"
            }
        },
}

def getConfig(platform):
    for key in software:
        if type(key) is str:
            if platform == key:
                return software[key]
        elif platform in key:
            return software[key]
    raise RuntimeError("unsupported platform: " + platform)
