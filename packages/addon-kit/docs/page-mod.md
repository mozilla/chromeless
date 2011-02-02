<!-- contributed by Nickolay Ponomarev [asqueella@gmail.com] -->
<!-- contributed by Myk Melez [myk@mozilla.org] -->
<!-- contributed by Irakli Gozalishvil [gozala@mozilla.com] -->

Overview
--------
The page-mod module enables add-on developers to execute scripts in the context
of specific web pages. Most obviously you could use page-mod to dynamically
modify the content of certain pages.

The module exports a constructor function `PageMod` which creates a new page
modification (or "mod" for short).

A page mod does not modify its pages until those pages are loaded or reloaded.
In other words, if your add-on is loaded while the user's browser is open, the
user will have to reload any open pages that match the mod for the mod to affect
them.

To stop a page mod from making any more modifications, call its `destroy`
method.

Like all modules that interact with web content, page-mod uses content
scripts that execute in the content process and defines a messaging API to
communicate between the content scripts and the main add-on script. For more
details on content scripting see the tutorial on [interacting with web
content](#guide/addon-development/web-content).

To create a PageMod the add-on developer supplies:

* a set of rules to select the desired subset of web pages based on their URL.
Each rule is specified using the
[match-pattern](#module/api-utils/match-pattern) syntax.

* a set of content scripts to execute in the context of the desired pages.

* a value for the onAttach option: this value is a function which will be
called when a page is loaded that matches the ruleset. This is used to set up a
communication channel between the add-on code and the content script.

All these parameters are optional except for the ruleset, which must include
at least one rule.

The following add-on displays an alert whenever a page matching the ruleset is
loaded:

    var pageMod = require("page-mod");
    pageMod.PageMod({
      include: "*.org",
      contentScript: 'window.alert("Page matches ruleset");'
    });

If you specify a value of "ready" for `contentScriptWhen` then the content
script can interact with the DOM itself:

    var pageMod = require("page-mod");
    pageMod.PageMod({
      include: "*.org",
      contentScriptWhen: 'ready',
      contentScript: 'document.body.innerHTML = ' +
                     ' "<h1>Page matches ruleset</h1>";'
    });

### <a name="pagemod-content-scripts">Communicating With Content Scripts</a>###

When a matching page is loaded the `PageMod` will call the function that the
add-on code supplied to `onAttach`. The `PageMod` supplies one argument to
this function: a `worker` object.

The worker can be thought of as the add-on's end of
a communication channel between the add-on code and the content scripts that
have been attached to this page.

Thus the add-on can pass messages to the content scripts by calling the
worker's `postMessage` function and can receive messages from the content
scripts by registering a function as a listener to the worker's `on` function.

Note that if multiple matching pages are loaded simultaneously then each page
is loaded into its own execution context with its own copy of the content
scripts. In this case `onAttach` is called once for each loaded page, and the
add-on code will have a separate worker for each page:

![Multiple workers](media/multiple-workers.jpg)

This is demonstrated in the following example:

    var pageMod = require("page-mod");
    var tabs = require("tabs");

    var workers = new Array();

    pageMod.PageMod({
      include: ["http://www.mozilla*"],
      contentScriptWhen: 'ready',
      contentScript: "onMessage = function onMessage(message) {" +
                     "  window.alert(message);};",
      onAttach: function onAttach(worker) {
        if (workers.push(worker) == 3) {
          workers[0].postMessage("The first worker!");
          workers[1].postMessage("The second worker!");
          workers[2].postMessage("The third worker!");
        }
      }
    });

    tabs.open("http://www.mozilla.com");
    tabs.open("http://www.mozilla.org");
    tabs.open("http://www.mozilla-europe.org");

Here we specify a ruleset to match any URLs starting with
"http://www.mozilla". When a page matches we add the supplied worker to
an array, and when we have three workers in the array we send a message to
each worker in turn, telling it the order in which it was attached. The
worker just displays the message in an alert box.

This shows that separate pages execute in separate contexts and that each
context has its own communication channel with the add-on script.

Note though that while there is a separate worker for each execution context,
the worker is shared across all the content scripts associated with a single
execution context. In the following example we pass two content scripts into
the `PageMod`: these content scripts will share a worker instance.

In the example each content script identifies itself to the add-on script
by sending it a message using the global `postMessage` function. In the
`onAttach` function the add-on code logs the fact that a new page is
attached and registers a listener function that simply logs the message:


    var pageMod = require("page-mod");
    const data = require("self").data;
    var tabs = require("tabs");

    pageMod.PageMod({
      include: ["http://www.mozilla*"],
      contentScriptWhen: 'ready',
      contentScript: ["postMessage('Content script 1 is attached to '+ " +
                      "document.URL);",
                      "postMessage('Content script 2 is attached to '+ " +
                      "document.URL);"],
      onAttach: function onAttach(worker) {
        console.log("Attaching content scripts")
        worker.on('message', function(data) {
          console.log(data);
        });
      }
    });

    tabs.open("http://www.mozilla.com");

The console output of this add-on is:

<pre>
  info: Attaching content scripts
  info: Content script 1 is attached to http://www.mozilla.com/en-US/
  info: Content script 2 is attached to http://www.mozilla.com/en-US/
</pre>

<api name="PageMod">
@class
A PageMod object. Once activated a page mod will execute the supplied content
scripts in the context of any pages matching the pattern specified by the
'include' property.
<api name="PageMod">
@constructor
Creates a PageMod.
@param options {object}
  Options for the PageMod, with the following keys:
  @prop include {string,array}
    A match pattern string or an array of match pattern strings.  These define
    the pages to which the PageMod applies.  See the
    [match-pattern](#module/api-utils/match-pattern) module for
    a description of match pattern syntax.
    At least one match pattern must be supplied.

  @prop [contentScriptFile] {string,array}
    The local file URLs of content scripts to load.  Content scripts specified
    by this option are loaded *before* those specified by the `contentScript`
    option. Optional.
  @prop [contentScript] {string,array}
    The texts of content scripts to load.  Content scripts specified by this
    option are loaded *after* those specified by the `contentScriptFile` option.
    Optional.
  @prop [contentScriptWhen] {string}
    When to load the content scripts.  Optional.
    Possible values are "start" (default), which loads them as soon as
    the window object for the page has been created, and "ready", which loads
    them once the DOM content of the page has been loaded.
  @prop [onAttach] {function}
A function to call when the PageMod attaches content scripts to
a matching page. The function will be called with one argument, a `worker`
object which the add-on script can use to communicate with the content scripts
attached to the page in question.

</api>

<api name="include">
@property {List}
A [list](#module/api-utils/list) of match pattern strings.  These define the
pages to which the page mod applies.  See the
[match-pattern](#module/api-utils/match-pattern) module for a description of
match patterns. Rules can be added to the list by calling its `add` method and
removed by calling its `remove` method.

</api>

<api name="destroy">
@method
Stops the page mod from making any more modifications.  Once destroyed the page
mod can no longer be used.  Note that modifications already made to open pages
will not be undone.
</api>

</api>
