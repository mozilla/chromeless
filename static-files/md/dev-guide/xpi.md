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
    bar/package.json:
      {
        "description": "A package used by 'foo' as a library."
      }
    <BLANKLINE>
    bar/lib/bar-module.js:
      exports.add = function add(a, b) {
        return a + b;
      };
    <BLANKLINE>
    foo/package.json:
      {
        "description": "A package w/ a main module; can be built into
                        an extension.",
        "dependencies": ["jetpack-core", "bar"]
      }
    <BLANKLINE>
    foo/lib/main.js:
      exports.main = function(options, callbacks) {
        console.log("1 + 1 =", require("bar-module").add(1, 1));
        callbacks.quit();
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
only packages cited as dependencies by `foo`'s `package.json` will
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

When we run `cfx xpi` to build the `foo` package into an extension,
`foo`'s dependencies are calculated, and a XPI file is generated that
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
    resources/testing-bar-lib/bar-module.js:
      exports.add = function add(a, b) {
        return a + b;
      };
    <BLANKLINE>
    resources/testing-foo-lib/main.js:
      exports.main = function(options, callbacks) {
        console.log("1 + 1 =", require("bar-module").add(1, 1));
        callbacks.quit();
      };
    <BLANKLINE>
    resources/testing-jetpack-core-lib/loader.js:
      // This module will be imported by the XPCOM harness/boostrapper
      // via Components.utils.import() and is responsible for creating a
      // CommonJS module loader.
    <BLANKLINE>
    harness-options.json:
      {'loader': 'resource://testing-jetpack-core-lib/loader.js',
       'main': 'main',
       'packageData': {},
       'resourcePackages': {'testing-bar-lib': 'bar',
                            'testing-foo-lib': 'foo',
                            'testing-jetpack-core-lib': 'jetpack-core'},
       'resources': {'testing-bar-lib': ['resources',
                                         'testing-bar-lib'],
                     'testing-foo-lib': ['resources',
                                         'testing-foo-lib'],
                     'testing-jetpack-core-lib': ['resources',
                                                  'testing-jetpack-core-lib']},
       'rootPaths': ['resource://testing-jetpack-core-lib/',
                     'resource://testing-bar-lib/',
                     'resource://testing-foo-lib/']}

It can be observed from the listing above that the `bar` package's `lib`
directory will be mapped to `resource://testing-bar-lib/` when the XPI is
loaded.

Similarly, the `lib` directories of `jetpack-core` and `foo` will be
mapped to `resource://testing-jetpack-core-lib/` and
`resource://testing-foo-lib/`, respectively.

The prefix `testing-` has been prepended to all `resource:` URIs to
effectively namespace the XPI's resources, ensuring that they don't
collide with anything else--including other extensions built by the
SDK and containing some of the same packages. In actual use, the
prefix will actually contain a unique ID instead of the word
`testing`.
