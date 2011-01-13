The Add-on SDK supports event-driven programming through its
[`EventEmitter`](#module/api-utils/events) framework. Objects emit events
on state changes that might be of interest to add-on code, such as browser
windows opening, pages loading, network requests completing, and mouse clicks.
By registering a listener function to an event emitter an add-on can receive
notifications of these events.

The interface exposed by an event emitter consists of two functions:

* **`on(type, listener)`**: register a listener
* **`removeListener(type, listener)`**: remove a listener

## Adding Listeners ##

You can add a listener to an event emitter by calling its `on(type, listener)`
method.

It takes two parameters:

* **`type`**: the type of event we are interested in, identified by a string.
Many event emitters may emit more than one type of event: for example, a browser
window might emit both `open` and `close` events. The list of valid event types
is specific to an event emitter and is included with its documentation.

* **`listener`**: the listener itself. This is a function which will be called
whenever the event occurs. The arguments that will be passed to the listener
are specific to an event type and are documented with the event emitter.

For example, the following add-on registers two listeners with the
[`private-browsing`](#module/addon-kit/private-browsing) module to listen
for the `start` and `stop` events, and logs a string to the console reporting
the change:

    var pb = require("private-browsing");

    pb.on("start", function() {
      console.log("Private browsing is on");
    });

    pb.on("stop", function() {
      console.log("Private browsing is off");
    });

It is not possible to enumerate the set of listeners for a given event.

The value of `this` in the listener function is the object that emitted
the event.

### Adding Listeners in Constructors ###

Event emitters may be modules, as is the case for the
`private-browsing` events, or they may be objects returned by
constructors.

In the latter case the `options` object passed to the constructor typically
defines properties whose names are the names of supported event types prefixed
with "on": for example, "onOpen", "onReady" and so on. Then in the constructor
you can assign a listener function to this property as an alternative to
calling the object's `on()` method.

For example: the [`widget`](#modules/addon-kit/widget) object emits an event
when the widget is clicked.

The following add-on creates a widget and assigns a listener to the
`onClick` property of the `options` object supplied to the widget's
constructor. The listener loads the Google home page:

    var widgets = require("widget");
    var tabs = require("tabs");

    widgets.Widget({
      label: "Widget with an image and a click handler",
      contentURL: "http://www.google.com/favicon.ico",
      onClick: function() {
        tabs.open("http://www.google.com/");
      }
    });

This is exactly equivalent to constructing the widget and then calling the
widget's `on()` method:

    var widgets = require("widget");
    var tabs = require("tabs");

    var widget = widgets.Widget({
      label: "Widget with an image and a click handler",
      contentURL: "http://www.google.com/favicon.ico"
    });

    widget.on("click", function() {
      tabs.open("http://www.google.com/");
    });

## Removing Event Listeners ##

Event listeners can be removed by calling `removeListener(type, listener)`,
supplying the type of event and the listener to remove.

The listener must have been previously been added using one of the methods
described above.

In the following add-on, we add two listeners to private-browsing's `start`
event, enter and exit private browsing, then remove the first listener and
enter private browsing again.

    var pb = require("private-browsing");

    function listener1() {
      console.log("Listener 1");
      pb.removeListener("start", listener1);
    }

    function listener2() {
      console.log("Listener 2");
    }

    pb.on("start", listener1);
    pb.on("start", listener2);

    pb.activate();
    pb.deactivate();
    pb.activate();

Removing listeners is optional since they will be removed in any case
when the application or add-on is unloaded.

## Message Events ##

One particular type of event which is fundamental to the Add-on SDK is the
`message` event. In the SDK add-ons which interact with web content are
structured in two parts:

* the main add-on code that runs in the add-on process
* content scripts that interact with web content and run in the content process

These two parts communicate using a message-passing mechanism in which the
message recipient can emit `message` and `error` events. Thus an add-on can
receive messages from a content script by supplying a `message` listener to the
event emitter's `on()` method. Most, but not all, of the messaging APIs use
the [`worker`](#modules/jetpack-code/content/worker) module to implement
message events.

For example, the [`page-mod`](#modules/addon-kit/page-mod) module provides a
mechanism to execute scripts in the context of selected web pages. These
scripts are content scripts.

When a content script is attached to a page the page mod emits the
`attach` event, which will supply a worker object to registered
listeners. If you add a listener to this worker object, then you will receive
messages from the associated content script.

The following add-on creates a page mod object which will execute the script
`postMessage(window.location.toString());` in the context of every page loaded.
The add-on registers two event listeners:

* The first listens to the `attach` event generated by the page mod and
uses this event to get the worker object associated with the content script.

* The second listens to the `message` event generated by the worker and just
logs the message to the console.

The effect is that all messages from the content script are logged to the
console.

    var pageMod = require("page-mod");

    pageMod.PageMod({
      include: ["*"],
      contentScriptWhen: "ready",
      contentScript: "postMessage(window.location.toString());",
      onAttach: function onAttach(worker, mod) {
        worker.on("message", function(data) {
          console.log(data);
        });
      }
    });

The next section provides much more detail on [interacting with web
content](#guide/web-content) using content scripts.
