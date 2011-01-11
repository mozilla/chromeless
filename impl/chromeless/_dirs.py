import os

class Dirs(object):
    def __init__(self):
        self.cuddlefish_root = os.environ['CUDDLEFISH_ROOT']
        self.build_dir = os.path.join(self.cuddlefish_root, "build")
        self.python_lib_dir = os.path.join(self.cuddlefish_root, "impl")
