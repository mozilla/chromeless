# The fetcher class is responsible for pulling down a platform appropriate
# version of xulrunner and installing it into a build directory.

import sys
import os
import platform
import hashlib
import urllib
import urlparse
import zipfile
import tarfile
import math

from . import _config

class Fetcher(object):
    def __init__(self, buildDir):
        # ensure that the top level directory into which we'll install
        # xulrunner exists
        self._check_build_dir(buildDir)
        self._buildDir = os.path.abspath(buildDir)
        self._system = platform.system() + "_" + platform.architecture()[0]
        self._config = _config.getConfig(self._system)
        # maybe we want to move this cache dir into a dot directory in the users
        # system?  would this be horrible, or helpful?
        self._cacheDir = os.path.join(self._buildDir, "cache")
        return

    def _md5_match(self, path, want):
        return self._calc_md5(path) == want

    def _calc_md5(self, path):
        try:
            fp = open(path, 'rb')
            try:
                sig = hashlib.md5()
                while True:
                    chunk = fp.read(1024 * 16)
                    if not chunk: break
                    sig.update(chunk)
                return sig.hexdigest()
            finally:
                fp.close()
        except IOError:
            return 'error'

    def needs_fetch(self):
        try:
            want = self._config["bin"]["sig"]
        except KeyError:
            want = False
        path = os.path.join(self._buildDir, self._config["bin"]["path"])
        if os.path.exists(path) and not want:
            print 'No bin/sig setting for %s' % path
            print 'Hash:'
            print '  %s' % self._calc_md5(path)
            return False
        return not self._md5_match(path, want)

    def _check_build_dir(self, buildDir):
        if not os.path.isdir(buildDir):
            os.makedirs(buildDir)
        return

    def _print(self, descriptor, string):
        if descriptor != None:
            print >>descriptor, string

    # actually go out and fetch the tarball, store it under build/cache
    def _fetch(self, descriptor = None):
        url = self._config["url"]
        if not os.path.isdir(self._cacheDir):
            os.mkdir(self._cacheDir)
        self._tarball = os.path.join(self._cacheDir, os.path.basename(urlparse.urlparse(url).path))
        # if the tarball has already been downloaded and md5 checks out, don't go fetch it
        # again.
        if os.path.exists(self._tarball):
            if self._md5_match(self._tarball, self._config['md5']):
                return
            else:
                os.remove(self._tarball)
        # now go fetch
        u = urllib.urlopen(url)
        size = int(u.info()['content-length'])
        rd = 0
        self._print(descriptor, "Fetching xulrunner, " + str(size) + " bytes from " + urlparse.urlparse(url).netloc)
        f = open(self._tarball, "wb+")
        self._print(descriptor, "| 0%                                                               100% |")
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
        if not self._config['md5']:
            descriptor.write('No md5 listed in _config; for the record:\n')
            descriptor.write('    %s\n' % self._calc_md5(self._tarball))
        elif not self._md5_match(self._tarball, self._config['md5']):
            os.remove(self._tarball)
            raise RuntimeError("download failure!  md5 mismatch!")
        return

    # unpack the tarball (or zipfile) into the build directory
    def _unpack(self,descriptor,path):
        if not os.path.isfile(path):
            raise RuntimeError("path doesn't exist, cannot unpack: " + path)
        if (any(path.endswith(ext) for ext in (".tgz",".tar.gz",".tbz2",".tar.bz2"))):
            self._print(descriptor, "extracting " + os.path.basename(path))
            f = tarfile.open(path)
            try:
                f.extractall(self._buildDir)
            finally:
                f.close()
        elif (path.endswith(".zip")):
            self._print(descriptor, "extracting " + os.path.basename(path))
            f = zipfile.ZipFile(path)
            try:
                f.extractall(self._buildDir)
            finally:
                f.close()
        else:
            raise RuntimeError("I don't know how to extract '" + os.path.basename(path) + "'")
        # if after all that we still think we need to fetch the thing,
        # that means unpacked bits don't match expected signatures.
        # safest to purge them from disk and/or refuse to run
        if self.needs_fetch():
            raise RuntimeError("Signature mismatch in unpacked xulrunner contents.  Eep!")
        return

    def run(self, descriptor=sys.stdout):
        self._fetch(descriptor)
        self._unpack(descriptor, self._tarball)

    def xulrunner_path(self):
        return os.path.join(self._buildDir, self._config["bin"]["path"])
