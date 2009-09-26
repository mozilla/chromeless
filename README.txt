JEP 28 Reference Implementation README
======================================

This a work-in-progress reference implementation of JEP-28, aka the
Cuddlefish Minilib:

  https://wiki.mozilla.org/Labs/Jetpack/JEP/28

This is a lightweight XULRunner application, so as to make the
implementation application-agnostic and not inadvertently cause us to
use technologies particular to Firefox, Thunderbird, or any other
XULRunner application. A side benefit is that the test suite is
able to load and run fairly quickly, since no temporary profile
needs to be created or loaded, etc.

Running The Test Suite
----------------------

The test suite can automatically be run by executing the following
command from the root directory of the repository:

  python run_tests.py

The runner will automatically find a Firefox installation to use as
the XULRunner host, though you can also specify a different binary
through the command-line.  Run 'python run_tests.py --help' for more
information on this.

If you have any questions, feel free to send them to the Jetpack
mailing list:

  http://groups.google.com/group/mozilla-labs-jetpack/
