Welcome to the Jetpack SDK.

Prerequisites
-------------

To develop with the new Jetpack SDK, you'll need:

* [Python](http://www.python.org/) 2.5 or greater.

* A working version of Firefox, Thunderbird, or the XULRunner SDK that
  uses Gecko 1.9.2 or later (e.g., Firefox 3.6).

* If you're on Windows, you'll also need [Python for Windows extensions](http://python.net/crew/skippy/win32/Downloads.html),
  though we'll be removing this dependency soon (see bug 534371).

Sanity Check
------------

Run this at your shell prompt:

    cfx testall

This should produce output that looks something like this:

    Testing all available packages: test-harness, jetpack-core.
    
    ...........................................................
    ...........................................................
    ............................................
    
    Malloc bytes allocated (in use by application): 8872960
    Malloc bytes mapped (not necessarily committed): 17653760
    Malloc bytes committed (r/w) in default zone: 8882512
    Malloc bytes allocated (in use) in default zone: 16605184
    Tracked memory objects in testing sandbox: 2

    162 of 162 tests passed.
    OK
    Total time: 1.511243 seconds
    Program terminated successfully.

**Note**: If you're on Windows, you may need to add the `--no-quit` option to `cfx` to prevent the above output from disappearing instantly.

Unit and behavioral testing is something that we're trying to make as easy and fast as possible in the Jetpack reboot, because it's imperative that we know when breakages occur between the Mozilla platform and Jetpack, and we also need to make sure that creating new functionality or modifying existing code doesn't break other things.
