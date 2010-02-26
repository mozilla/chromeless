<span class="aside">
For a gentle introduction to packaging, see the [Packaging](#guide/packaging)
tutorial.
</span>

A *package* is a directory that, at minimum, contains a JSON file
called `package.json`. This file is also referred to as the
*package manifest*.

## The Package Manifest ##

`package.json` may contain the following keys: 

* `name` - the name of the package. The package system will only load
  one package with a given name. This name cannot contain spaces. The
  name defaults to the name of the parent directory. If the package is
  ever built as an XPI and the `fullName` key is not present, this is
  used as the extension's `em:name` element in its `install.rdf`.

* `fullName` - the full name of the package. It can contain spaces. If
  the package is ever built as an XPI, this is used as the extension's
  `em:name` element in its `install.rdf`.

* `description` - a String describing the package. If the package is
  ever built as an XPI, this is used as the extension's
  `em:description` element in its `install.rdf`.

* `author` - the original author of the package. The author may be a
  String including an optional URL in parentheses and optional email
  address in angle brackets. If the package is ever built as an XPI,
  this is used as the extension's `em:creator` element in its
  `install.rdf`.

* `contributors` - may be an Array of additional author Strings.

* `url` - the URL of the package's website.

* `license` - the name of the license as a String, with an optional
  URL in parentheses.

* `id` - a globally unique identifier for the package, which is
  usually either a String in the form of a GUID or an email
  address. If the package is ever built as an XPI, this is used as the
  extension's `em:id` element in its `install.rdf`.

* `version` - a String representing the version of the package. If the
  package is ever built as an XPI, this is used as the extension's
  `em:version` element in its `install.rdf`.

* `dependencies` - a String or Array of Strings representing package
  names that this package requires in order to function properly.

* `lib` - a String or Array of Strings representing top-level module
  directories provided in this package. Defaults to `"lib"`.

* `tests` - a String or Array of Strings representing top-level module
  directories containing test suites for this package. Defaults to
  `"tests"`.

* `packages` - a String or Array of Strings representing paths to
  directories containing additional packages, defaults to
  `"packages"`.

* `main` - a String representing the name of a program module that is
  located in one of the top-level module directories specified by
  `lib`.

## Documentation ##

A package may optionally contain a [Markdown]-formatted file called
`README.md` in its root directory. Package-browsing tools may display
this file to developers.

Additionally, Markdown files can be placed in an optional `docs`
directory. When package-browsing tools are asked to show the
documentation for a module, they will look in this directory for a
`.md` file with the module's name. Thus, for instance, if a user
browses to a module at `lib/foo/bar.js`, the package-browsing tool
will look for a file at `docs/foo/bar.js` to represent the module's
API documentation.

## Data Resources ##

Packages may optionally contain a directory called `data` into which
arbitrary files may be placed, such as images or text files. The
URL for these resources may be reached via the `packaging` global
defined in the [Jetpack Globals] appendix.

  [Markdown]: http://daringfireball.net/projects/markdown/
  [Jetpack Globals]: #guide/globals
