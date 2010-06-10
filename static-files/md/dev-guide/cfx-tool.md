<!-- contributed by Noelle Murata [fiveinchpixie@gmail.com] -->
The `cfx`command line tool gives you access to the SDK documentation and development
servers; as well as testing, running, and building packages.

Any of the cfx commands can be run with the following options:

Global Options:

    -h, --help        - show this help message and exit
    -v, --verbose     - enable lots of output

# Global Commands #

**`cfx docs`**

This command launches a mini-server on the localhost to view web-based
documentation in a new Firefox window.

**`cfx sdocs`**

Executing this command builds a tarball of the .md and .json files as well as
the JavaScript needed to render the Markdown correctly. The tarball will be
saved to the directory in which the command was executed.

**`cfx testcfx`**

This will run a number of tests on the cfx tool, including tests against the
documentation. Use `cfx testcfx -v` for the specific list of tests.

**`cfx testpkgs`**

This will test all of the available CommonJS packages. Note that the number
of tests run and their success depends on what application they are run
with, and which binary is used.

**`cfx testex`**

This will test all available example code. Note that the number
of tests run and their success depends on what application they are run
with, and which binary is used.

**`cfx testall`**

This will test *everything*: the cfx tool, all available CommonJS packages,
and all examples.

Run options:

    -a APP, --app=APP            application to run: xulrunner (default), firefox,
                                 fennec, or thunderbird

    -b BINARY, --binary=BINARY   path to application binary

    -P PROFILEDIR, --profiledir=PROFILEDIR
                                 profile directory to pass to the application

    -r, --use-server             use development server

    -f LOGFILE, --logfile=LOGFILE
                                 log console output to file


Test options:

    -d, --dep-tests              include tests for all dependencies

    -x ITERATIONS, --times=ITERATIONS
                                 number of times to run tests

**`cfx develop`**

This initiates an instance of a host application in development mode,
and allows you to pipe commands into it from another shell without
having to constantly restart it. Aside from convenience, for Jetpack
Platform developers this has the added benefit of making it easier to
detect leaks.

For example, in shell A, type:

    cfx develop

in shell B, type:

    cfx test -r

This will send `cfx test -r` output to shell A. If you repeat the
command in shell B, `cfx test -r` output will appear again in shell A
without restarting the host application.

# Package Specific Commands #

**`cfx xpcom`**

This tool is used to build xpcom objects.

Compile options:

    -s MOZ_SRCDIR, --srcdir=MOZ_SRCDIR
                                 Mozilla source directory

    -o MOZ_OBJDIR, --objdir=MOZ_OBJDIR
                                 Mozilla object directory

Package creation/run options:

    -p PKGDIR, --pkgdir=PKGDIR   package dir containing the package.json; default is
                                 the current dir

    -t TEMPLATEDIR, --templatedir=TEMPLATEDIR
                                 XULRunner application extension template

    -k EXTRA_PACKAGES, --extra-packages=EXTRA_PACKAGES
                                 extra packages to include, comma-separated

    -g CONFIG, --use-config=CONFIG
                                 use named config from local.json

**`cfx xpi`**

<span class="aside"> For more information on how XPIs are generated,
see the [XPI Generation](#guide/xpi) reference.</span>

This tool is used to build the XPI file that you can distribute by submitting it to
[addons.mozilla.org][].

[addons.mozilla.org]: http://addons.mozilla.org

Compile options:

    -u UPDATE_URL, --update-url=UPDATE_URL
                                 update URL in install.rdf

    -l UPDATE_LINK, --update-link=UPDATE_LINK
                                 generate update.rdf


Package creation/run options:

    -p PKGDIR, --pkgdir=PKGDIR   package dir containing the package.json; default is
                                 the current dir

    -t TEMPLATEDIR, --templatedir=TEMPLATEDIR
                                 XULRunner application extension template

    -k EXTRA_PACKAGES, --extra-packages=EXTRA_PACKAGES
                                 extra packages to include, comma-separated

    -g CONFIG, --use-config=CONFIG
                                 use named config from local.json

**`cfx run`**

This tool is used to run the extension code.

Run options:

    -a APP, --app=APP            application to run: xulrunner (default), firefox,
                                 fennec, or thunderbird

    -b BINARY, --binary=BINARY   path to application binary

    -P PROFILEDIR, --profiledir=PROFILEDIR
                                 profile directory to pass to the application

    -r, --use-server             use development server

    -f LOGFILE, --logfile=LOGFILE
                                 log console output to file

Package creation/run options:

    -p PKGDIR, --pkgdir=PKGDIR   package dir containing the package.json; default is
                                 the current dir

    -t TEMPLATEDIR, --templatedir=TEMPLATEDIR
                                 XULRunner application extension template

    -k EXTRA_PACKAGES, --extra-packages=EXTRA_PACKAGES
                                 extra packages to include, comma-separated

    -g CONFIG, --use-config=CONFIG
                                 use named config from local.json

**`cfx test`**

Run available tests for the specified package.

Run options:

    -a APP, --app=APP            application to run: xulrunner (default), firefox,
                                 fennec, or thunderbird

    -b BINARY, --binary=BINARY   path to application binary

    -P PROFILEDIR, --profiledir=PROFILEDIR
                                 profile directory to pass to the application

    -r, --use-server             use development server

    -f LOGFILE, --logfile=LOGFILE
                                 log console output to file

Test options:

    -d, --dep-tests              include tests for all dependencies

    -x ITERATIONS, --times=ITERATIONS
                                 number of times to run tests



# Configuring local.json #

Define configuration options using a file called `local.json` which should live
in the root directory of your SDK. You can specify command-line options for cfx
using a key called "configs".

For example:

    {
        "configs": {
            "ff35": ["-a", "firefox", "-b", "/home/me/firefox-3.5/firefox-bin"]
        }
    }

Using the above configuration, you can run:

    cfx testall --use-config=ff35

And it would be equivalent to:

    cfx testall -a firefox -b /home/me/firefox-3.5/firefox-bin

This method of defining configuration options can be used for all of the run,
build, and test tools. If "default" is defined in the `local.json` cfx will use
that configuration unless otherwise specified.

