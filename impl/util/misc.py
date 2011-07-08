import os, errno
import shutil

def opencopy(path, mode):
        try:
                return open(path, mode)
        except IOError as (ecode, estr):
                if ecode == errno.EACCES and \
                   mode == 'w' and \
                   os.path.islink(path):
                           target = os.path.realpath(path)
                           print 'Make a copy of the read-only file %s' % target
                           os.unlink(path)
                           shutil.copyfile(target, path)
                           return open(path, mode)
                else:
                        raise
