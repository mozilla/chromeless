The `self` module provides access to data that is bundled with the add-on or
jetpack program as a whole. It also provides the "add-on ID", a value which
is unique for each add-on.

<api name="id">
@property {string}
This property is a printable string that is unique for each add-on. It comes
from the `id` property set in the `package.json` file in the main package
(i.e. the package in which you run `cfx xpi`). While not generally of use to
add-on code directly, it can be used by internal API code to index local
storage and other resources that are associated with a particular add-on.
Eventually, this ID will be unspoofable (see
[JEP 118](https://wiki.mozilla.org/Labs/Jetpack/Reboot/JEP/118) for details).
</api>

<span class="aside">
The [Package Specification](#guide/package-spec) section explains the
`package.json` file.
</span>

<api name="data">
@property {object}
The `data` object is used to access data that was bundled with the add-on.
This data lives in the main package's `data/` directory, immediately below
the `package.json` file. All files in this directory will be copied into the
XPI and made available through the `data` object.
</api>

<api name="data.load">
@method
The `data.load(NAME)` method returns the contents of an embedded data file,
as a string. It is most useful for data that will be modified or parsed in
some way, such as JSON, XML, plain text, or perhaps an HTML template. For
data that can be displayed directly in a content frame, use `data.url(NAME)`.
@param name {string} The filename to be read, relative to the 
  package's `data` directory. Each package that uses the `self` module
  will see its own `data` directory.
@returns {string}
</api>

<span class="aside">
The 0.6 SDK release does not have the Panel API yet. Watch 
[JEP 103](https://wiki.mozilla.org/Labs/Jetpack/Reboot/JEP/103) for updates.
</span>

<api name="data.url">
@method
The `data.url(NAME)` method returns a URL instance that points at an embedded
data file. It is most useful for data that can be displayed directly in a
content frame. The URL instance can be passed to a content frame constructor,
such as the Panel:

    let p = Panel({frame: {content: self.data.url("status.html")}});
    p.show()
@param name {string} The filename to be read, relative to the 
  package's `data` directory. Each package that uses the `self` module
  will see its own `data` directory.
@returns {URL}
</api>
