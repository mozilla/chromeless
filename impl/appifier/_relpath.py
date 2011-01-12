import posixpath
import os
import platform

def relpath(path, start=os.getcwd()):
    """Return a relative version of a path"""
    sep = "/"
    if platform.system() == 'Windows':
      sep = "\\"

    if not path:
        raise ValueError("no path specified")
    start_list = posixpath.abspath(start).split(sep)
    path_list = posixpath.abspath(path).split(sep)
    # Work out how much of the filepath is shared by start and path.
    i = len(posixpath.commonprefix([start_list, path_list]))
    rel_list = [start] * (len(start_list)-i) + path_list[i:]
    if not rel_list:
        return start
    r = sep.join(rel_list)
    return r
