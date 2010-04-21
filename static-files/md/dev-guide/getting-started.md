Welcome to the Jetpack SDK.

Prerequisites
-------------

To develop with the new Jetpack SDK, you'll need:

* [Python] 2.5 or greater.

* A working version of Firefox, Thunderbird, or the [XULRunner SDK] that
  uses Gecko 1.9.2 or later (e.g., Firefox 3.6).

  [Python]: http://www.python.org/
  [XULRunner SDK]: https://developer.mozilla.org/en/Gecko_SDK

Installation
------------

At the time of this writing, the latest stable version of the Jetpack
SDK is 0.3. You can obtain it as a [tarball] or a [zip file].

Alternatively, you can get the latest development version of the
Jetpack SDK from its [HG repository].

Regardless of which option you choose, simply enter the root directory
of your checkout with a shell/command prompt. This directory should
be called `jetpack-sdk`.

<span class="aside">
Unlike many development tools, there isn't a system-wide location for
the Jetpack SDK. Instead, developers can have as many installations of
the SDK as they want, each configured separately from one
another. Each installation is called a *virtual environment*.
</span>

Then, if you're on Linux, OS X, or another Unix-based system, run:

    source bin/activate

Otherwise, if you're on Windows, run:

    bin\activate

Now the beginning of your command prompt should contain the text
`(jetpack-sdk)`, which means that your shell has entered a special
virtual environment that gives you access to the Jetpack SDK's
command-line tools.

At any time, you can leave a virtual environment by running
`deactivate`.

  [tarball]: https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-0.3.tar.gz
  [zip file]: https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-0.3.zip
  [HG repository]: http://hg.mozilla.org/labs/jetpack-sdk/

Sanity Check
------------

<span class="aside">
Unit and behavioral [testing] is something that
we're trying to make as easy and fast as possible in the Jetpack SDK,
because it's imperative that we know when breakages occur between the
Mozilla platform and Jetpack. We also need to make sure that creating
new functionality or modifying existing code doesn't break other
things.

  [testing]: http://www.mindview.net/WebLog/log-0025
</span>

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

**Note**: By default, running `cfx` with no special options will
attempt to find Firefox in its most common location on your system and
use it to perform the action you requested.  If you have multiple
versions of Firefox on your system, however, or if you want to use
Thunderbird or the XULRunner SDK, then you may have to use `cfx`'s
`--app` and/or `--binary` command-line options. Run `cfx --help` for
more information on this.

Once you're ready, move on to the next section: [Packaging].

  [Packaging]: #guide/packaging
