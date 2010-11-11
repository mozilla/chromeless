# The fetcher class is responsible for pulling down a platform appropriate
# version of xulrunner and installing it into a build directory.

import sys,os,platform,md5,urllib,urlparse,zipfile,tarfile,math
from . import config

class Fetcher():
    def __init__(self, buildDir):
        # ensure that the top level directory into which we'll install
        # xulrunner exists
        self.__checkBuildDir(buildDir)
        self.__buildDir = os.path.abspath(buildDir)
        self.__system = platform.system() + "_" + platform.architecture()[0]
        self.__config = config.getConfig(self.__system)
        # maybe we want to move this cache dir into a dot directory in the users
        # system?  would this be horrible, or helpful?
        self.__cacheDir = os.path.join(self.__buildDir, "cache")
        return

    def __md5Match(self, path, want):
        got = ""
        try:
            f = open(path)
            got = md5.new(f.read()).hexdigest()
            f.close()
        except IOError:
            pass
        return got == want

    def needsFetch(self):
        for path in self.__config["sigs"]:
            want = self.__config["sigs"][path]
            path = os.path.join(self.__buildDir, path)
            if (not self.__md5Match(path, want)):
                return True
        return False

    def __checkBuildDir(self, buildDir):
        if not os.path.exists(buildDir):
            os.mkdir(buildDir)
        if not os.path.isdir(buildDir):
            raise RuntimeError(buildDir + " is not a directory (nor could I create it)")
        return

    def __print(self, descriptor, string):
        if descriptor != None:
            print >>descriptor, string

    # actually go out and fetch the tarball, store it under build/cache
    def __fetch(self, descriptor = None):
        url = self.__config["url"]
        if not os.path.isdir(self.__cacheDir):
            os.mkdir(self.__cacheDir)
        self.__tarball = os.path.join(self.__cacheDir, os.path.basename(urlparse.urlparse(url).path))
        # if the tarball has already been downloaded and md5 checks out, don't go fetch it
        # again.
        if os.path.exists(self.__tarball):
            if self.__md5Match(self.__tarball, self.__config['md5']):
                return True
            else:
                os.remove(self.__tarball)
        # now go fetch
        u = urllib.urlopen(url)
        size = int(u.info()['content-length'])
        rd = 0
        self.__print(descriptor, "Fetching xulrunner, " + str(size) + " bytes from " + urlparse.urlparse(url).netloc)
        f = open(self.__tarball, "w+")
        self.__print(descriptor, "| 0%                                                               100% |")
        dots = 0
        while (True):
            d = u.read(1024 * 10)
            if (len(d) == 0):
                break
            rd += len(d)
            # should we print?
            shouldHave = int(math.floor((float(rd) / size) * 72))
            if (descriptor != None):
                while (shouldHave > dots):
                    descriptor.write(("*","|")[dots == 0 or dots == 72])
                    descriptor.flush()
                    dots += 1
            f.write(d)
        if (descriptor != None):
            while (dots <= 72):
                descriptor.write(("*","|")[dots == 0 or dots == 72])
                dots += 1
            print ("")
        f.close()
        u.close()
        return True

    # unpack the tarball (or zipfile) into the build directory
    def __unpack(self,descriptor,path):
        if not os.path.isfile(path):
            raise RuntimeError("path doesn't exist, cannot unpack: " + path)
        ext = os.path.splitext(path)[1]
        if (any(map(lambda x: path.endswith(x), (".tgz",".tar.gz",".tbz2",".tar.bz2")))):
            self.__print(descriptor, "extracting " + os.path.basename(path))
            tf = tarfile.open(path)
            tf.extractall(self.__buildDir)
            tf.close
        elif (path.endswith(".zip")):
            raise RuntimeError("zip extraction not yet implemented");
        else:
            raise RuntimeError("I don't know how to extract '" + os.path.basename(path) + "'")
        return

    def run(self, descriptor=sys.stdout):
        self.__fetch(descriptor)
        self.__unpack(descriptor, self.__tarball)
