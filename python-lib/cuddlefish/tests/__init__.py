import os
import unittest
import doctest
import glob

def get_tests():
    import cuddlefish
    import cuddlefish.tests

    tests = []
    packages = [cuddlefish, cuddlefish.tests]
    for package in packages:
        path = os.path.abspath(package.__path__[0])

        txtnames = glob.glob(os.path.join(path, '*.txt'))
        for filename in txtnames:
            tests.append(doctest.DocFileTest(filename, module_relative=False))

        pynames = glob.glob(os.path.join(path, '*.py'))
        for filename in pynames:
            basename = os.path.basename(filename)
            module_name = os.path.splitext(basename)[0]
            full_name = "%s.%s" % (package.__name__, module_name)
            module = __import__(full_name, fromlist=[package.__name__])

            loader = unittest.TestLoader()
            suite = loader.loadTestsFromModule(module)
            for test in suite:
                tests.append(test)

            finder = doctest.DocTestFinder()
            doctests = finder.find(module)
            for test in doctests:
                if len(test.examples) > 0:
                    tests.append(doctest.DocTestCase(test))

    return tests

def run(verbose=False):
    if verbose:
        verbosity = 2
    else:
        verbosity = 1

    tests = get_tests()
    suite = unittest.TestSuite(tests)
    runner = unittest.TextTestRunner(verbosity=verbosity)
    runner.run(suite)

if __name__ == '__main__':
    run()
