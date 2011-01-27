<!-- contributed by Myk Melez [myk@mozilla.org] -->
<!-- contributed by Irakli Gozalishvili [gozala@mozilla.com] -->


This module is not intended to be used directly by programs.  Rather, it is
intended to be used by other modules that provide APIs to programs.


This module exports `Symbiont` trait that can be used for creating JavaScript
contexts that can access web content in host application frames (i.e. XUL
`<iframe>` and `<browser>` elements) and communicate with programs via
asynchronous JSON pipes.  It is useful in the construction of APIs that
are compatible with the execution model codenamed "electrolysis" in which
programs run in separate processes from web content.

Introduction
------------

`Symbiont` constructs a content symbiont for a given frame, it loads the
specified contentURL and scripts into it, and plumbs an asynchronous
JSON pipe between the content symbiont object and the content symbiont
context. If frame is not provided hidden frame will be created.

Examples
--------

    const { Symbiont } = require('content');
    const Thing = Symbiont.resolve({ constructor: '_init' }).compose({
      constructor: function Thing(options) {
        // `getMyFrame` returns the host application frame in which
        // the page is loaded.
        this._frame = getMyFrame();
        this._init(options)
      }
    });

See the [panel] module for a real-world example of usage of this module.

[panel]:#module/api-utils/panel

Reference
---------

<api name="Symbiont">
@class
Symbiont is composed from the [Worker] trait, therefore instances
of Symbiont and their descendants expose all the public properties
exposed by [Worker] along with additional public properties that
are listed below:

[Worker]:#module/api-utils/content/worker
<api name="Symbiont">
@constructor
Creates a content symbiont.
@param options {object}
  Options for the constructor. Includes all the keys that [Worker] constructor
  accepts and few additional:
[Worker]:#module/api-utils/panel
  @prop [frame] {object}
    The host application frame in which the page is loaded.
    If frame is not provided hidden one will be created.
  @prop [contentScriptWhen] {string}
    When to load the content scripts.  Optional.
    Possible values are "start" (default), which loads them as soon as
    the window object for the page has been created, and "ready", which loads
    them once the DOM content of the page has been loaded.
  @prop [allow] {object}
    Permissions for the content, with the following keys:
      @prop [script] {boolean}
      Whether or not to execute script in the content.  Defaults to true.
      Optional.
    Optional.
</api>

<api name="contentScriptFile">
@property {array}
The local file URLs of content scripts to load.  Content scripts specified by
this property are loaded *before* those specified by the `contentScript`
property.
</api>

<api name="contentScript">
@property {array}
The texts of content scripts to load.  Content scripts specified by this
property are loaded *after* those specified by the `contentScriptFile` property.
</api>

<api name="contentScriptWhen">
@property {string}
When to load the content scripts.
Possible values are "start" (default), which loads them as soon as
the window object for the page has been created, and "ready", which loads
them once the DOM content of the page has been loaded.
</api>

<api name="contentURL">
@property {string}
The URL of the content loaded.
</api>

<api name="allow">
@property {object}
Permissions for the content, with the following keys:
  @prop script {boolean}
  Whether or not to execute script in the content.  Defaults to true.
</api>

</api>


