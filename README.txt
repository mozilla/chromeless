JEP 25 Reference Implementation README
======================================

This a work-in-progress reference implementation of JEP-25, aka Chrome
Boosters:

  https://wiki.mozilla.org/Labs/Jetpack/JEP/25

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

The runner will automatically attempt to download necessary CommonJS
compliance tests if they're not already available.  It will also
automatically find a Firefox installation to use as the XULRunner
host, though you can also specify a different binary through the
command-line.  Run 'python run_tests.py --help' for more information
on this.

Examining The Code
------------------

The primary script that implements JEP 25 is located at:

  chrome/modules/booster.js

This script is all that's needed to take advantage of JEP 25's
features in any XULRunner extension. The code which uses this
implementation in the test runner is located here:

  chrome/content/main.xul
  chrome/content/main.js

If you have any other questions, feel free to send them to the
Jetpack mailing list:

  http://groups.google.com/group/mozilla-labs-jetpack/
