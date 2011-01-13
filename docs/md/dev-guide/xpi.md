<span class="aside">
Note that some parts of the following text have been simplified to
allow you get a better idea of what's going on when a XPI is created.
</span>

Running `cfx xpi` in the directory of any package that contains a program
will bundle the package and all its dependencies
into a standalone XPI. This document explains how this process
works under the hood.

Source Packages
---------------

We start out with a simplified `packages` directory with three
packages, structured like so:

    >>> from cuddlefish.tests.test_xpi import document_dir
    >>> document_dir('packages')
    aardvark/lib/main.js:
      exports.main = function(options, callbacks) {
        console.log("1 + 1 =", require("bar-module").add(1, 1));
        callbacks.quit();
      };
    aardvark/package.json:
      {
        "description": "A package w/ a main module; can be built into an extension.",
        "dependencies": ["api-utils", "barbeque"]
      }
    api-utils/lib/loader.js:
      // This module will be imported by the XPCOM harness/boostrapper
      // via Components.utils.import() and is responsible for creating a
      // CommonJS module loader.
    api-utils/package.json:
      {
        "description": "A foundational package that provides a CommonJS module loader implementation.",
        "loader": "lib/loader.js"
      }
    barbeque/lib/bar-module.js:
      exports.add = function add(a, b) {
        return a + b;
      };
    barbeque/package.json:
      {
        "description": "A package used by 'aardvark' as a library."
      }

Note that our `packages` directory could actually contain more
packages, too. This doesn't affect the generated XPI, however, because
only packages cited as dependencies by `aardvark`'s `package.json` will
ultimately be included in the XPI.

The XPI Template
----------------

The Add-on SDK also contains a directory that contains a template for
a XPI file:

    >>> document_dir('xpi-template')
    components/harness.js:
      // This file contains XPCOM code that bootstraps an SDK-based add-on
      // by loading its harness-options.json, registering all its resource
      // directories, executing its loader, and then executing its program's
      // main() function.

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
      // This file contains XPCOM code that bootstraps an SDK-based add-on
      // by loading its harness-options.json, registering all its resource
      // directories, executing its loader, and then executing its program's
      // main() function.
    resources/guid-api-utils-lib/:
    <BLANKLINE>
    resources/guid-api-utils-lib/loader.js:
      // This module will be imported by the XPCOM harness/boostrapper
      // via Components.utils.import() and is responsible for creating a
      // CommonJS module loader.
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
    harness-options.json:
      {
       "loader": "resource://guid-api-utils-lib/loader.js", 
       "main": "main", 
       "manifest": {
        "resource://guid-aardvark-lib/main.js": {
         "chrome": false, 
         "e10s-adapter": null, 
         "hash": "a592cf3cf924f2c77e0728d97131138fcb7495c77f5202ac55c2e0c77ef903c2", 
         "name": "main", 
         "packageName": "aardvark", 
         "requires": {
          "bar-module": {
           "url": "resource://guid-barbeque-lib/bar-module.js"
          }
         }, 
         "sectionName": "lib", 
         "zipname": "resources/guid-aardvark-lib/main.js"
        }, 
        "resource://guid-api-utils-lib/loader.js": {
         "chrome": false, 
         "e10s-adapter": null, 
         "hash": "efac9dc700a56e693ac75ab81955c11e6874ddc83d92c11177d643601eaac346", 
         "name": "loader", 
         "packageName": "api-utils", 
         "requires": {}, 
         "sectionName": "lib", 
         "zipname": "resources/guid-api-utils-lib/loader.js"
        }, 
        "resource://guid-barbeque-lib/bar-module.js": {
         "chrome": false, 
         "e10s-adapter": null, 
         "hash": "2515f8623e793571f1dffc4828de14a00a3da9be666147f8cebb3b3f1929e4d6", 
         "name": "bar-module", 
         "packageName": "barbeque", 
         "requires": {}, 
         "sectionName": "lib", 
         "zipname": "resources/guid-barbeque-lib/bar-module.js"
        }
       }, 
       "packageData": {}, 
       "resourcePackages": {
        "guid-aardvark-lib": "aardvark", 
        "guid-api-utils-lib": "api-utils", 
        "guid-barbeque-lib": "barbeque"
       }, 
       "resources": {
        "guid-aardvark-lib": [
         "resources", 
         "guid-aardvark-lib"
        ], 
        "guid-api-utils-lib": [
         "resources", 
         "guid-api-utils-lib"
        ], 
        "guid-barbeque-lib": [
         "resources", 
         "guid-barbeque-lib"
        ]
       }, 
       "rootPaths": [
        "resource://guid-api-utils-lib/", 
        "resource://guid-barbeque-lib/", 
        "resource://guid-aardvark-lib/"
       ]
      }

It can be observed from the listing above that the `barbeque` package's `lib`
directory will be mapped to `resource://guid-barbeque-lib/` when the XPI is
loaded.

Similarly, the `lib` directories of `api-utils` and `aardvark` will be
mapped to `resource://guid-api-utils-lib/` and
`resource://guid-aardvark-lib/`, respectively.

In an actual XPI built by the SDK, the string `"guid"` in these
examples is a unique identifier that the SDK prepends to all
`resource:` URIs to namespace the XPI's resources so they don't
collide with anything else, including other extensions built by the
SDK and containing the same packages. This GUID is built from the
[Program ID](#guide/program-id).
