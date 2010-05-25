<span class="aside">
Note that some parts of the following text have been simplified to
allow you get a better idea of what's going on when a XPI is created.
</span>

Running `cfx xpi` in the directory of any package that contains a
Jetpack Program will bundle the package and all its dependencies
into a standalone XPI. This document explains how this process
works under the hood.

Source Packages
---------------

We start out with a simplified `packages` directory with three
packages, structured like so:

    >>> from cuddlefish.tests.test_xpi import document_dir
    >>> document_dir('packages')
    aardvark/package.json:
      {
        "description": "A package w/ a main module; can be built into
                        an extension.",
        "dependencies": ["jetpack-core", "barbeque"]
      }
    <BLANKLINE>
    aardvark/lib/main.js:
      exports.main = function(options, callbacks) {
        console.log("1 + 1 =", require("bar-module").add(1, 1));
        callbacks.quit();
      };
    <BLANKLINE>
    barbeque/package.json:
      {
        "description": "A package used by 'aardvark' as a library."
      }
    <BLANKLINE>
    barbeque/lib/bar-module.js:
      exports.add = function add(a, b) {
        return a + b;
      };
    <BLANKLINE>
    jetpack-core/package.json:
      {
        "description": "A foundational package that provides a CommonJS
                        module loader implementation.",
        "loader": "lib/loader.js"
      }
    <BLANKLINE>
    jetpack-core/lib/loader.js:
      // This module will be imported by the XPCOM harness/boostrapper
      // via Components.utils.import() and is responsible for creating a
      // CommonJS module loader.

Note that our `packages` directory could actually contain more
packages, too. This doesn't affect the generated XPI, however, because
only packages cited as dependencies by `aardvark`'s `package.json` will
ultimately be included in the XPI.

The XPI Template
----------------

The Jetpack SDK also contains a directory that contains a template for
a XPI file:

    >>> document_dir('xpi-template')
    components/harness.js:
      // This file contains XPCOM code that bootstraps a
      // Jetpack-based extension by loading its harness-options.json,
      // registering all its resource directories, executing its loader,
      // and then executing its main module's main() function.

A template different than the default can be specified via the
`cfx` tool's `--templatedir` option.

The Generated XPI
-----------------

When we run `cfx xpi` to build the `aardvark` package into an extension,
`aardvark`'s dependencies are calculated, and a XPI file is generated that
combines all required packages, the XPI template, and a few other
auto-generated files:

    >>> document_dir('xpi-output')
    install.rdf:
      <RDF><!-- Extension metadata is here. --></RDF>
    components/harness.js:
      // This file contains XPCOM code that bootstraps a
      // Jetpack-based extension by loading its harness-options.json,
      // registering all its resource directories, executing its loader,
      // and then executing its main module's main() function.
    resources/guid-aardvark-lib/:
    <BLANKLINE>
    resources/guid-aardvark-lib/main.js:
      exports.main = function(options, callbacks) {
        console.log("1 + 1 =", require("bar-module").add(1, 1));
        callbacks.quit();
      };
    resources/guid-barbeque-lib/:
    <BLANKLINE>
    resources/guid-barbeque-lib/bar-module.js:
      exports.add = function add(a, b) {
        return a + b;
      };
    resources/guid-jetpack-core-lib/:
    <BLANKLINE>
    resources/guid-jetpack-core-lib/loader.js:
      // This module will be imported by the XPCOM harness/boostrapper
      // via Components.utils.import() and is responsible for creating a
      // CommonJS module loader.
    harness-options.json:
      {
       "loader": "resource://guid-jetpack-core-lib/loader.js",
       "main": "main",
       "packageData": {},
       "resourcePackages": {
        "guid-aardvark-lib": "aardvark",
        "guid-barbeque-lib": "barbeque",
        "guid-jetpack-core-lib": "jetpack-core"
       },
       "resources": {
        "guid-aardvark-lib": [
         "resources",
         "guid-aardvark-lib"
        ],
        "guid-barbeque-lib": [
         "resources",
         "guid-barbeque-lib"
        ],
        "guid-jetpack-core-lib": [
         "resources",
         "guid-jetpack-core-lib"
        ]
       },
       "rootPaths": [
        "resource://guid-jetpack-core-lib/",
        "resource://guid-barbeque-lib/",
        "resource://guid-aardvark-lib/"
       ]
      }

It can be observed from the listing above that the `barbeque` package's `lib`
directory will be mapped to `resource://guid-barbeque-lib/` when the XPI is
loaded.

Similarly, the `lib` directories of `jetpack-core` and `aardvark` will be
mapped to `resource://guid-jetpack-core-lib/` and
`resource://guid-aardvark-lib/`, respectively.

In an actual XPI built by the SDK, the string `"guid"` in these
examples is a unique identifier that the SDK prepends to all
`resource:` URIs to namespace the XPI's resources so they don't
collide with anything else, including other extensions built by the
SDK and containing the same packages. This GUID is built from the
"Jetpack ID", described below.

The Program ID
--------------

Each jetpack-based program (including add-on) gets a unique identifier
string, based upon a cryptographic keypair generated the first time you run
`cfx xpi`. You keep the private key safe on your local computer. The public
key is used as the "Program ID", and is written into the `package.json` file
as the `id` key. Eventually, the generated XPI (or other distribution format)
will be signed by the private key, so the browser (or other tools) can verify
that the XPI was signed by the original author and not by someone else.

This ID is used to index things like the `simple-storage` API, and is tracked
by services like addons.mozilla.org to tell the difference between a new
add-on and upgrades of an existing one. Addons can learn their ID by using
the `require("self").id` call. The cryptographic properties of the keypair
makes these IDs "unforgeable": no other add-on can successfully pretend to
have your ID.

When you run `cfx xpi` for the first time on a new add-on, your
`package.json` will be examined for the presence of an `id` key. If missing,
a new keypair will be generated for you: the public key will be written into
`package.json`, and the private key will be saved in a file in
`~/.jetpack/keys/` (or a similar place on windows). You will be asked to
re-run the `cfx xpi` command so it can pick up the updated ID.

The private key is very important! If you lose it, you will not be able to
upgrade your add-on: you'll have to create a new add-on ID, and your users
will have to manually uninstall the old one and install the new one. If
somebody else gets a copy of your private key, they will be able to write
add-ons that could displace your own.

The add-on's private key needs to be available (in ~/.jetpack/keys/) on any
computer that you use to build that add-on. When you copy the add-on source
code to a new machine, you also need to copy the private key (`cfx xpi` will
remind you of this). The best idea is to just copy the whole `~/.jetpack`
directory to a USB flash drive that you can carry with you. It is not stored
in your package source tree, so that you can show your code to somebody else
without also giving them the ability to create forged upgrades for your
add-on.

If you start your add-on work by copying somebody else's source code, you'll
need to remove their Program ID from the `package.json` file before you can
build your own XPIs. Again, `cfx xpi` will remind you of this, and your
options, when you attempt to build an XPI from a `package.json` that
references a private key that you don't have in `~/.jetpack/keys/`.
