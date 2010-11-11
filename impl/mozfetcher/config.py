software = {
    "Linux_64bit": {
       "url": "http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/latest-trunk/xulrunner-2.0b8pre.en-US.linux-x86_64.tar.bz2",
       "md5": "a51d73e008bdc583e01d03ecd7988f16",
       "sigs": {
            "xulrunner/xulrunner": "6edae91d12aca0de126b7636d9f53468"
       }
    }
}

def getConfig(platform):
    if platform in software:
        return software[platform]
    raise RuntimeError("unsupported platform: " + platform)
