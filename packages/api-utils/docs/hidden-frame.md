<!-- contributed by Myk Melez [myk@mozilla.org] -->

The `hidden-frame` module creates host application frames (i.e. XUL `<iframe>`
elements) that are not displayed to the user.  It is useful in the construction
of APIs that load web content not intended to be directly seen or accessed
by users, like `page-worker`.  It is also useful in the construction of APIs
that load web content for intermittent display, such as `panel`.

This module is not intended to be used directly by programs.  Rather, it is
intended to be used by other modules that provide APIs to programs.

Introduction
------------

The module exports a constructor function, `HiddenFrame`, and two other
functions, `add` and `remove`.

`HiddenFrame` constructs a new hidden frame.  `add` registers a hidden frame,
preparing it to load content.  `remove` unregisters a frame, unloading any
content that was loaded in it.

Examples
--------

The following code creates a hidden frame, loads a web page into it, and then
logs its title:

    const hiddenFrames = require("hidden-frame");
    let hiddenFrame = hiddenFrames.add(hiddenFrames.HiddenFrame({
      onReady: function() {
        this.element.contentWindow.location = "http://www.mozilla.org/";
        let self = this;
        this.element.addEventListener("DOMContentLoaded", function() {
          console.log(self.element.contentDocument.title);
        }, true, true);
      }
    }));

See the `panel` module for a real-world example of usage of this module.

Reference
---------
<api name="HiddenFrame">
@class
`HiddenFrame` objects represent hidden frames.
<api name="HiddenFrame">
@constructor
Creates a hidden frame.
@param options {object}
  Options for the frame, with the following keys:
  @prop onReady {function,array}
    Functions to call when the frame is ready to load content.  You must specify
    an `onReady` callback and refrain from using the hidden frame until
    the callback gets called, because hidden frames are not always ready to load
    content the moment they are added.
</api>

<api name="add">
@function
Register a hidden frame, preparing it to load content.
@param hiddenFrame {HiddenFrame} the frame to add
</api>

<api name="remove">
@function
Unregister a hidden frame, unloading any content that was loaded in it.
@param hiddenFrame {HiddenFrame} the frame to remove
</api>

<api name="element">
@property {DOMElement}
The host application frame in which the page is loaded.
</api>

<api name="onReady">
@property {array}
Functions to call when the frame is ready to load content.
</api>
</api>
