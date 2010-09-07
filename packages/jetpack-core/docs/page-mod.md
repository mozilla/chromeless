<!-- contributed by Nickolay Ponomarev [asqueella@gmail.com] -->
<!-- contributed by Myk Melez [myk@mozilla.org] -->

The `page-mod` module provides an easy way to run scripts in the context of
a given set of pages.

Introduction
------------

The module exports a constructor function, `PageMod`, and two other functions,
`add` and `remove`.

`PageMod` constructs a new page modification (mod).  `add` registers a page mod,
activating it for the pages to which it applies.  `remove` unregisters a page
mod, deactivating it.

Examples
--------

Add content to a variety of pages:

    var pageMod = require("page-mod");
    pageMod.add(new pageMod.PageMod({
      include: ["*.example.com",
                "http://example.org/a/specific/url",
                "http://example.info/*"],
      onStart: function(wrappedWindow) {
        // this runs each time a new content document starts loading, but
        // before the page starts loading, so we can't interact with the
        // page's DOM here yet.
        wrappedWindow.wrappedJSObject.newExposedProperty = 1;
      },
      onReady: function(wrappedWindow) {
        // at this point we can work with the DOM
        wrappedWindow.document.body.innerHTML = "<h1>Page Mods!</h1>";
      }
    }));

Note: currently, it is necessary to access the `wrappedJSObject` of window
and document objects in order to set properties on them that the web page
can access.  We are working to remove this restriction.

Reference
---------

<api name="PageMod">
@constructor
Creates a page mod.
@param options {object}
  Options for the page mod, with the following keys:
  @prop include {string,array}
    The pages to which the page mod should apply.  An rule or array of rules
    matching the URLs of pages.  There are four kinds of rules:
    <dl>
      <dt>* (a single asterisk)</dt>
        <dd>any URL with the http(s) or ftp scheme</dd>
      <dt>*.domain.name</dt>
        <dd>
          pages from the specified domain and all its subdomains,
          regardless of their scheme
        </dd>
      <dt>http://example.com/*</dt>
        <dd>any URLs with the specified prefix</dd>
      <dt>http://example.com/test</dt>
        <dd>the single specified URL</dd>
    </dl>

  @prop [onStart] {function,array}
    Functions to call when a matching page starts loading.

  @prop [onReady] {function,array}
    Functions to call when a matching page's DOM is ready.
</api>

<api name="add">
@function
Register a page mod, activating it for the pages to which it applies.
@param page mod {PageMod} the page mod to add
</api>

<api name="remove">
@function
Unregister a page mod, deactivating it.
@param page mod {PageMod} the page mod to remove
</api>

PageMod
-------

`PageMod` objects represent page mods.

<api name="include">
@property {Collection}
The pages to which the page mod should apply.  An collection of rules matching
the URLs of pages.  Add rules to the collection by calling its `add` method
and remove them by calling its `remove` method.  There are four kinds of rules:
<dl>
  <dt>* (a single asterisk)</dt>
    <dd>any URL with the http(s) or ftp scheme</dd>
  <dt>*.domain.name</dt>
    <dd>
      pages from the specified domain and all its subdomains,
      regardless of their scheme
    </dd>
  <dt>http://example.com/*</dt>
    <dd>any URLs with the specified prefix</dd>
  <dt>http://example.com/test</dt>
    <dd>the single specified URL</dd>
</dl>
</api>

<api name="onStart">
@property {Collection}
Functions to call when a matching page starts loading.
Add functions to the collection by calling its `add` method
and remove them by calling its `remove` method.
</api>

<api name="onReady">
@property {Collection}
Functions to call when a matching page's DOM is ready.
Add functions to the collection by calling its `add` method
and remove them by calling its `remove` method.
</api>
