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
      onAttach: function onAttach(worker, mod) {
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
    A match pattern string or an array of match pattern strings.  These define
    the pages to which the page mod applies.  See the [match-pattern] module for
    a description of match patterns.
    [match-pattern]: #module/jetpack-core/match-pattern
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
A [List] of match pattern strings.  These define the pages to which the page mod
applies.  See the [match-pattern] module for a description of match patterns.
Rules can be added to the list by calling its `add` method and removed by
calling its `remove` method.

[List]: https://jetpack.mozillalabs.com/sdk/latest/docs/#module/jetpack-core/list
[match-pattern]: #module/jetpack-core/match-pattern
</api>
