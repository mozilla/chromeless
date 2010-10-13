import sys

from cuddlefish import runner

def xulrunner_app_runner_doctests():
    """
    >>> runner.XulrunnerAppRunner(binary='foo')
    Traceback (most recent call last):
    ...
    Exception: Binary path does not exist foo

    >>> runner.XulrunnerAppRunner(binary=sys.executable)
    Traceback (most recent call last):
    ...
    ValueError: application.ini not found in cmdargs

    >>> runner.XulrunnerAppRunner(binary=sys.executable,
    ...                         cmdargs=['application.ini'])
    Traceback (most recent call last):
    ...
    ValueError: file does not exist: 'application.ini'
    """

    pass
