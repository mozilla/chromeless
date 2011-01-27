<!-- contributed by Irakli Gozalishvili [gozala@mozilla.com] -->

Introduction
------------

Module exports `Worker` trait may be used for constructing objects
implementing [Worker] interface defined by the W3C, with minor differences.
Content workers are message-passing facilities for communication between
code running in the content and add-on process. It is important to note that
unlike "web workers," this workers run in the same process as web content and
browser chrome, and therefore code within workers can block UI.

[Worker]:http://www.w3.org/TR/workers/#worker

<api name="Worker">
@class
Worker is composed from the [EventEmitter] trait, therefore instances
of Worker and their descendants expose all the public properties
exposed by [EventEmitter] along with additional public properties that
are listed below.

Content workers may emit two types of events:

####"message"#####
Event allows the content worker to receive messages from the enclosed content
content scripts. Calling `postMessage` function from the one of the content
scripts will asynchronously emit 'message' event on the worker.

####"error"####
Event allows the content worker to react on an uncaught runtime script error
that occurs in one of the content scripts.

**Example**

    const workers = require("content/worker");
    let worker =  workers.Worker({
      window: require("window-utils").activeWindow,
      contentScript: "onMessage = function(data) { " +
                     "  postMessage(window.location + ': Hi ' + data.name); " +
                     "};",
      onMessage: function(msg) {
        console.log(msg);
      }
    });
    worker.postMessage({ name: 'worker'});

[EventEmitter]:#module/api-utils/events
<api name="Worker">
@constructor
Creates a content worker.
@param options {object}
Options for the constructor, with the following keys:
  @prop window {object}
    The content window to create JavaScript sandbox for communication with.
  @prop [contentScriptFile] {string,array}
    The local file URLs of content scripts to load.  Content scripts specified
    by this option are loaded *before* those specified by the `contentScript`
    option. Optional.
  @prop [contentScript] {string,array}
    The texts of content scripts to load.  Content scripts specified by this
    option are loaded *after* those specified by the `contentScriptFile` option.
    Optional.
  @prop [onMessage] {function}
    Functions that will registered as a listener to a 'message' events.
  @prop [onError] {function}
    Functions that will registered as a listener to an 'error' events.
</api>

<api name="postMessage">
@method
Asynchronously emits `"message"` events in the enclosed worker, where content
script was loaded.
@param data {number,string,JSON}
The data to send. Must be stringifiable to JSON.
</api>
</api>

