import os

class Dirs(object):
    def __init__(self):
        self.cuddlefish_root = os.environ['CUDDLEFISH_ROOT']
        self.home_dir = os.path.expanduser("~/.chromeless")
        self.build_dir = os.path.join(self.home_dir, "build")
        self.python_lib_dir = os.path.join(self.cuddlefish_root, "impl")
