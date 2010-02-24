<span class="aside">
For a gentle introduction to packaging, see the [Packaging](#guide/packaging)
tutorial.
</span>

A *package* is simply a directory that contains a JSON file called `package.json`. 

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
