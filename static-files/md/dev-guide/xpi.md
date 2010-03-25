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
    <BLANKLINE>
    components/harness.js:
      // This file contains XPCOM code that bootstraps a
      // Jetpack-based extension by loading its harness-options.json,
      // registering all its resource directories, executing its loader,
      // and then executing its main module's main() function.
    <BLANKLINE>
    resources/GUID-aardvark-lib/main.js:
      exports.main = function(options, callbacks) {
        console.log("1 + 1 =", require("bar-module").add(1, 1));
        callbacks.quit();
      };
    <BLANKLINE>
    resources/GUID-barbeque-lib/bar-module.js:
      exports.add = function add(a, b) {
        return a + b;
      };
    <BLANKLINE>
    resources/GUID-jetpack-core-lib/loader.js:
      // This module will be imported by the XPCOM harness/boostrapper
      // via Components.utils.import() and is responsible for creating a
      // CommonJS module loader.
    <BLANKLINE>
    harness-options.json:
      {'loader': 'resource://GUID-jetpack-core-lib/loader.js',
       'main': 'main',
       'packageData': {},
       'resourcePackages': {'GUID-aardvark-lib': 'aardvark',
                            'GUID-barbeque-lib': 'barbeque',
                            'GUID-jetpack-core-lib': 'jetpack-core'},
       'resources': {'GUID-aardvark-lib': ['resources',
                                           'GUID-aardvark-lib'],
                     'GUID-barbeque-lib': ['resources',
                                           'GUID-barbeque-lib'],
                     'GUID-jetpack-core-lib': ['resources',
                                               'GUID-jetpack-core-lib']},
       'rootPaths': ['resource://GUID-jetpack-core-lib/',
                     'resource://GUID-barbeque-lib/',
                     'resource://GUID-aardvark-lib/']}

It can be observed from the listing above that the `barbeque` package's `lib`
directory will be mapped to `resource://GUID-barbeque-lib/` when the XPI is
loaded.

Similarly, the `lib` directories of `jetpack-core` and `aardvark` will be
mapped to `resource://GUID-jetpack-core-lib/` and
`resource://GUID-aardvark-lib/`, respectively.

In an actual XPI built by the SDK, the string `"GUID"` in these
examples is a unique identifier that the SDK prepends to all
`resource:` URIs to namespace the XPI's resources so they don't
collide with anything else, including other extensions built by the
SDK and containing the same packages.
