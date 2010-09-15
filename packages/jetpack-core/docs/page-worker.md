<!-- contributed by Felipe Gomes [felipc@gmail.com] -->

The `page-worker` module provides a way to create a permanent, invisible page
and access its DOM.

Introduction
------------

The module exports a constructor function, `Page`, and two other functions,
`add` and `remove`.

`Page` constructs a new page.  `add` initializes the given page, which is a
prerequisite to using the page. `remove` unloads the given page, after which
its memory is freed, and you must create a new instance to load another page.

Pages have associated content scripts, which are JavaScript scripts that have
access to the content loaded into the pages.  A program can specify scripts
to load for a page worker, and the program can communicate with those scripts
over an asynchronous JSON pipe.

Reference
---------

Constructors
------------

<api name="Page">
@constructor
  Creates an uninitialized Page Worker instance.
@param [options] {object}
  The *`options`* parameter is optional, and if given it should be an object
  with any of the following keys:
  @prop [contentURL] {URL,string}
    The URL of the content to load in the panel.
  @prop [onReady] {function}
    A function callback that will be called when the DOM on the page is ready.
    This can be used to know when your Page Worker instance is ready to be used,
    and also whenever the page is reloaded or another page is loaded in its
    place.
  @prop [allow] {object}
    An object with keys to configure the permissions of the Page Worker.
    The boolean key `script` controls if scripts from the page
    are allowed to run. Its default value is false.
  @prop [contentScriptURL] {string,array}
    The URLs of content scripts to load.  Content scripts specified by this
    option are loaded *before* those specified by the `contentScript` option.
  @prop [contentScript] {string,array}
    The texts of content scripts to load.  Content scripts specified by this
    option are loaded *after* those specified by the `contentScriptURL` option.
  @prop [contentScriptWhen] {string}
    When to load the content scripts.
    Possible values are "start" (default), which loads them as soon as
    the window object for the page has been created, and "ready", which loads
    them once the DOM content of the page has been loaded.
  @prop [onMessage] {function,array}
    Functions to call when a content script sends the program a message.
</api>

Functions
---------

<api name="add">
@function
  Initialize the given Page Worker instance. You'll only be able to use its
  features after calling this function, which will define its properties
  as described in the Page Objects section below.
@param pageWorker {Page}
  The Page Worker instance to initialize.
</api>

<api name="remove">
@function
  Unload the given Page Worker instance. After you remove a Page Worker, its
  memory is freed and you must create a new instance if you need to load
  another page.
@param pageWorker {Page}
  The Page Worker instance to unload.
</api>

Page Objects
------------

`Page` objects represent Page Worker instances.  Once they have been initialized 
by calling `add()`, Page Worker instances have the following properties:


<api name="contentURL">
@property {URL}
The URL of the content loaded.
</api>

<api name="allow">
@property {object}
  An object with keys to configure the permissions on the Page Worker.
  The boolean key `script` controls if scripts from the page
  are allowed to run.
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

<api name="postMessage">
@method
Send a message to the content scripts.
@param message {string,number,object,array,boolean}
The message to send.  Must be stringifiable to JSON.
</api>

<api name="on">
@method
Registers an event `listener` that will be called when events of
specified `type` are emitted.

If the `listener` is already registered for this `type`, a call to this
method has no effect.

If the event listener is being registered while an event is being processed,
the event listener is not called during the current emit.

@param type {String}
  The type of event.

@param listener {Function}
  The listener function that processes the event.
</api>

Example:

    var page = require("page-worker").PageWorker({
      contentURL: 'http://mozilla.org'
    });
    page.on('message', function onMessage(message) {
      console.log(message);
    })

<api name="removeListener">
@method
Unregisters an event `listener` for the specified event `type`.

If the `listener` is not registered for this `type`, a call to this
method has no effect.

If an event listener is removed while an event is being processed, it is
still triggered by the current emit. After it is removed, the event listener
is never invoked again (unless registered again for future processing).

@param type {String}
  The type of event.
@param listener {Function}
  The listener function that processes the event.
</api>

Events
------
Content workers may emit following types of events:

####"message"####
Event allows the page worker to receive messages from the content scripts.
Calling `postMessage` function from the one of the content scripts will
asynchronously emit 'message' event on the worker. 

####"error"####
Event allows the page worker to react on an uncaught runtime script error
that occurs in one of the content scripts.

####"ready"####

Event is emitted when the DOM on the page is ready. This can be used to know
when your Page Worker instance is ready to be used, and also whenever the page
is reloaded or another page is loaded in its place.

Examples
--------

### Print all header titles from a Wikipedia article ###

First, don't forget to import the module:

    var pageWorkers = require("page-worker");
    
Then make a script that will send the titles from the content script
to the program:

    var script = "var elements = document.querySelectorAll('h2 > span'); " +
                 "for (var i = 0; i < elements.length; i++) { " +
                 "  postMessage(elements[i].textContent) " +
                 "}";

Finally, create a page pointed to Wikipedia and add it to the page workers:

    var page = pageWorkers.Page({
      contentURL: "http://en.wikipedia.org/wiki/Internet",
      contentScript: script,
      contentScriptWhen: "ready",
      onMessage: function(message) {
        console.log(message);
      }
    });
    pageWorkers.add(page);

The page's `onMessage` callback function will print all the titles it receives
from the content script.
