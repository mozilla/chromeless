Welcome to the Jetpack SDK.

Prerequisites
-------------

To develop with the new Jetpack SDK, you'll need:

<span class="aside">
Verify that Python is in your path.
</span>

* [Python] 2.5 or greater.

* A working version of Firefox, Thunderbird, or the [XULRunner SDK] that
  uses Gecko 1.9.2 or later (e.g., Firefox 3.6).

  [Python]: http://www.python.org/
  [XULRunner SDK]: https://developer.mozilla.org/en/Gecko_SDK

Installation
------------

At the time of this writing, the latest stable version of the Jetpack
SDK is 0.8pre. You can obtain it as a [tarball] or a [zip file].

Alternatively, you can get the latest development version of the
Jetpack SDK from its [HG repository].

Regardless of which option you choose, navigate to the root directory
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

  [tarball]: https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-latest.tar.gz
  [zip file]: https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-latest.zip
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

    cfx

It should produce output whose first line looks something like this, followed by
many lines of usage information:

    Usage: cfx [options] [command]

This is the `cfx` command-line program.  It's your primary interface to the
Jetpack SDK.  You use it to launch Firefox and test your add-on, package your
add-on for distribution, view documentation, and run unit tests.

Once you're ready, move on to the next section: [Packaging].

  [Packaging]: #guide/packaging
