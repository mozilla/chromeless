<!-- contributed by Myk Melez [myk@mozilla.org] -->

The `content-symbiont` module creates JavaScript contexts that can access web
content in host application frames (i.e. XUL `<iframe>` and `<browser>`
elements) and communicate with programs via asynchronous JSON pipes.  It is
useful in the construction of APIs that are compatible with the execution model
codenamed "electrolysis" in which programs run in separate processes from web
content.

This module is not intended to be used directly by programs.  Rather, it is
intended to be used by other modules that provide APIs to programs.

Introduction
------------

The module exports a constructor function, `ContentSymbiont`, and the function
`mixInto`.

`ContentSymbiont` constructs a content symbiont for a given frame, loads
the specified scripts into it, and plumbs an asynchronous JSON pipe between
the content symbiont object and the content symbiont context.

`mixInto` adds a set of properties to the specified object that provide an API
for using its content symbiont.  Consumers of this API can use `mixInto`
to obtain a set of properties (`content`, `allow`, `scriptURI`, etc.) that are
common to many APIs that use content symbionts.  Such APIs should use `mixInto`
to obtain that set of properties.

Examples
--------

Given a `Thing` object to which you want to add the functionality provided by
this module, first add content symbiont properties to instances of the object
and validate content symbiont configuration options by calling `mixInto`
in the `Thing` constructor:

    function Thing(options) {
      require("content-symbiont").mixInto(this, options);
      // the rest of the Thing constructor...
    }

Then, before the page is loaded (which may or may not be in the `Thing`
constructor, depending on whether or not the page is loaded upon construction
or some time afterwards), construct a `ContentSymbiont` object:

    let contentSymbiont = require("content-symbiont").ContentSymbiont({
      // "frame" is the host application frame in which the page is loaded.
      frame: frame,
      globalName: "thing",
      contentScriptURL: [contentScriptURL for
                         (contentScriptURL in thing.contentScriptURL)],
      contentScript: [contentScript for (contentScript in thing.contentScript)],
      contentScriptWhen: thing.contentScriptWhen,
      onMessage: function onMessage(message, cb) {
        for (let handler in thing.onMessage)
          errors.catchAndLog(function () handler.call(thing, message, cb))();
      }
    });

See the `panel` module for a real-world example of usage of this module.

Reference
---------

<api name="ContentSymbiont">
@constructor
Creates a content symbiont.
@param options {object}
  Options for the constructor, with the following keys:
  @prop frame {object}
    The host application frame in which the page is loaded.
  @prop globalName {string}
    The name of the global object the content scripts use to communicate
    with the creator of the content symbiont.
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
  @prop onMessage {function,array}
    Functions to call when a content script sends the program a message.
</api>

<api name="mixInto">
@function
Mix an API for using a content symbiont into the specified object.
@param object {object} the object into which to mix the API
@param options {object}
  Options for the function, with the following keys:
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
  @prop onMessage {function,array}
    Functions to call when a content script sends the program a message.
</api>

ContentSymbiont
---------------

`ContentSymbiont` objects represent content symbionts.

<api name="frame">
@property {DOMElement}
The host application frame in which the page is loaded.
</api>

<api name="globalName">
@property {string}
The name of the global object the content scripts use to communicate
with the creator of the content symbiont.
</api>

<api name="contentScriptURL">
@property {array}
The URLs of content scripts to load.  Content scripts specified by this property
are loaded *before* those specified by the `contentScript` property.
</api>

<api name="contentScript">
@property {array}
The texts of content scripts to load.  Content scripts specified by this
property are loaded *after* those specified by the `contentScriptURL` property.
</api>

<api name="contentScriptWhen">
@property {string}
When to load the content scripts.
Possible values are "start" (default), which loads them as soon as
the window object for the page has been created, and "ready", which loads
them once the DOM content of the page has been loaded.
</api>

<api name="onMessage">
@property {array}
Functions to call when a content script sends the program a message.
</api>

<api name="sendMessage">
@method
Send a message to the program.
@param message {string,number,object,array,boolean}
The message to send.  Must be stringifiable to JSON.
@param [callback] {function}
A function the program can call to respond to the message.  Optional.
</api>
