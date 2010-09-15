<!-- contributed by Nickolay Ponomarev [asqueella@gmail.com] -->
<!-- contributed by Myk Melez [myk@mozilla.org] -->
<!-- contributed by Irakli Gozalishvil [gozala@mozilla.com] -->

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
      // This runs each time a new content document starts loading, but
      // before the page starts loading, so we can't interact with the
      // page's DOM here yet.
      contentScript: 'window.newExposedProperty = 1;'
    }));

    // If you want to work with the DOM, then you should set `contentScriptWhen`
    // to `'ready'`.
    var pageMod = require("page-mod");
    pageMod.add(new pageMod.PageMod({
      include: ["*.example.com",
                "http://example.org/a/specific/url",
                "http://example.info/*"],
      contentScriptWhen: 'ready',
      contentScript: 'document.body.innerHTML = "<h1>Page Mods!</h1>";'
    }));

    // You can also pass messages between content scripts and the program.
    var pageMod = require("page-mod");
    var myPageMod = pageMod.add({
      include: [
        '*.example.com',
        'http://example.org/a/specific/url',
        'http://example.info/*'
      ],
      contentScriptWhen: 'ready',
      contentScript: 'onMessage = function onMessage() {' +
                     ' postMessage("My current location is: "' +
                                  '+ window.location);' +
                     '};'
      ,
      onOpen: function onOpen(worker, mod) {
        // you can handle errors that occur in the content scripts
        // by adding listener to the error events
        worker.on('error', function(error) {
          console.error(error.message);
        });
        worker.on('message', function(data) {
          console.log(data);
        });
        worker.postMessage('Worker, what is your location ?');
      }
    });

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
  @prop [contentScriptURL] {string,array}
    The URLs of content scripts to load.  Content scripts specified by this
    option are loaded *before* those specified by the `contentScript` option.
    Optional.
  @prop [contentScript] {string,array}
    The texts of content scripts to load.  Content scripts specified by this
    option are loaded *after* those specified by the `contentScriptURL` option.
    Optional.
  @prop [contentScriptWhen] {string}
    When to load the content scripts.  Optional.
    Possible values are "start" (default), which loads them as soon as
    the window object for the page has been created, and "ready", which loads
    them once the DOM content of the page has been loaded.
  @prop [onAttach] {function}
    A function to call when the page mod attaches content scripts to
    a matching page.

    Function will be called with two arguments:

    1. An object implementing [web worker] interface, that can be used
    for communication with a content scripts (See examples section for more
    details).
    [web worker]:http://www.w3.org/TR/workers/#worker
    2. `this` `PageMod`.
</api>

<api name="add">
@function
Register a page mod, activating it for the pages to which it applies.
@param pageMod {PageMod,Object}
The page mod to add, or options for a page mod to create and then add.
</api>

<api name="remove">
@function
Unregister a page mod, deactivating it.
@param pageMod {PageMod} the page mod to remove.
</api>

PageMod
-------

`PageMod` objects represent page mods.

<api name="include">
@property {List}
The pages to which the page mod should apply.  A [List] of rules matching
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

[List]:https://jetpack.mozillalabs.com/sdk/latest/docs/#module/jetpack-core/list
</api>

