<!-- contributed by Myk Melez [myk@mozilla.org] -->

The `panel` module creates floating modal "popup dialogs" that appear on top of
web content and browser chrome and persist until dismissed by users or programs.
Panels are useful for presenting temporary interfaces to users in a way that is
easier for users to ignore and dismiss than a modal dialog, since panels are
hidden the moment users interact with parts of the application interface outside
them.

Introduction
------------

The module exports a constructor function, `Panel`, and two other functions,
`add` and `remove`.

`Panel` constructs a new panel.  `add` registers a panel, loading its content
and preparing it to be shown when its `show` method is invoked.  `remove`
unregisters a panel, unloading the content that was loaded in it.

A panel's content is loaded as soon as it is added, before the panel is shown,
and the content remains loaded when a panel is hidden, so it is possible
to keep a panel around in the background, updating its content as appropriate
in preparation for the next time it is shown.

Panels can be anchored to a particular element in a DOM window, including both
chrome elements, i.e. parts of the host application interface, and content
elements, i.e. parts of a web page in an application tab.  Panels that are
anchored to an element should have an arrow that points from the panel to the
element, but that has not yet been implemented.  The work to implement it is
tracked in bug 554937.

Panels have associated content scripts, which are JavaScript scripts that have
access to the content loaded into the panels.  Programs can specify one or more
content scripts to load for a panel, and the program can communicate with those
scripts via an asynchronous message passing API.

Examples
--------

Create and show a simple panel with content from the `data/` directory:

    const panels = require("panel");
    const data = require("self").data;
    let panel = panels.add(panels.Panel({
      contentURL: data.url("foo.html")
    }));
    
    panel.show();

The following code creates a widget that opens a panel containing the mobile
version of Reddit.  The panel has an associated content script (see below)
that intercepts clicks on the titles of stories and passes their URLs to the
panel object, which loads them in new tabs, so users can load each story they
want to read in a new tab by clicking on the stories' titles.

    const widgets = require("widget");
    const panels = require("panel");
    const data = require("self").data;
    
    widgets.add(widgets.Widget({
      label: "Reddit",
      image: "http://www.reddit.com/static/favicon.ico",
      panel: panels.Panel({
        width: 240,
        height: 320,
        contentURL: "http://www.reddit.com/.mobile?keep_extension=True",
        contentScriptURL: [data.url("jquery-1.4.2.min.js"),
                           data.url("panel.js")],
        contentScriptWhen: "ready",
        onMessage: function(message, callback) {
          require("tab-browser").addTab(message);
        }
      })
    }));

This is the content script that intercepts the link clicks.  It uses jQuery,
which was also loaded as a content script, to interact with the DOM of the page.

    $(window).click(function (event) {
      var t = event.target;
    
      // Don't intercept the click if it isn't on a link.
      if (t.nodeName != "A")
        return;
    
      // Don't intercept the click if it was on one of the links in the header
      // or next/previous footer, since those links should load in the panel
      // itself.
      if ($(t).parents('#header').length || $(t).parents('.nextprev').length)
        return;
    
      // Intercept the click, passing it to the addon, which will load it in
      // a tab.
      event.stopPropagation();
      event.preventDefault();
      program.sendMessage(t.toString());
    });

See the `examples/reddit-panel` directory for the complete example (including
the content script containing jQuery).

Reference
---------

<api name="Panel">
@constructor
Creates a panel.
@param options {object}
  Options for the panel, with the following keys:
  @prop [width] {number}
    The width of the panel in pixels. Optional.
  @prop [height] {number}
    The height of the panel in pixels. Optional.
  @prop [contentURL] {URL,string}
    The URL of the content to load in the panel.
  @prop [allow] {object}
    Permissions for the content, with the following keys:
    @prop [script] {boolean}
      Whether or not to execute script in the content.  Defaults to true.
      Optional.
    Optional.
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
  @prop onShow {function,array}
    Functions to call when the panel is shown.
  @prop onHide {function,array}
    Functions to call when the panel is hidden.
</api>

<api name="add">
@function
Register a panel, loading its content and preparing it to be shown when its
`show` method is invoked.
@param panel {Panel} the panel to add
</api>

<api name="remove">
@function
Unregister a panel, unloading the content that was loaded in it.
@param panel {Panel} the panel to remove
</api>

Panel
-----

`Panel` objects represent panels.

<api name="height">
@property {number}
The height of the panel in pixels.
</api>

<api name="width">
@property {number}
The width of the panel in pixels.
</api>

<api name="contentURL">
@property {URL}
The URL of the content loaded in the panel.
</api>

<api name="allow">
@property {object}
Permissions for the content, with the following keys:
@prop script {boolean}
  Whether or not to execute script in the content.  Defaults to true.
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
Functions to call when a content script sends the panel a message.
</api>

<api name="sendMessage">
@method
Send a message to the content scripts.
@param message {string,number,object,array,boolean}
The message to send.  Must be stringifiable to JSON.
@param [callback] {function}
A function the content scripts can call to respond to the message.  Optional.
</api>

<api name="show">
@method
Display the panel.
@param [anchor] {DOMElement}
The element to which the panel should be anchored (i.e. appear connected).
If not specified, panels are centered relative to the most recent (frontmost)
primary application window.  Optional.
</api>

<api name="hide">
@method
Stop displaying the panel.
</api>
