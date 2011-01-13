Almost all interesting add-ons will need to interact with web content or the
browser's user interface. For example, they may need to access and modify the
content of web pages or be notified when the user clicks a link.

The SDK provides several core modules to support this:

***[panel](#module/addon-kit/panel)***<br>
Create a dialog that can host web content.

***[page-worker](#module/addon-kit/page-worker)***<br>
Retrieve a page and access its content, without displaying it to the user.

***[page-mod](#module/addon-kit/page-mod)***<br>
Execute scripts in the context of selected web pages.

***[widget](#module/addon-kit/widget)***<br>
Host an add-on's user interface, including web content.

***[context-menu](#module/addon-kit/context-menu)***<br>
Add items to the browser's context menu.

The Mozilla platform is moving towards a model in which it uses separate
processes to display the UI, handle web content, and execute add-ons. The main
add-on code will run in the add-on process and will not have direct access to
any web content.

This means that an add-on which needs to interact with web content needs to be
structured in two parts:  the main script runs in the add-on process, while
any code that needs to interact with web content is loaded into the web
content process as a separate script. These separate scripts are called
_content scripts_.

A single add-on may use multiple content scripts, and content scripts loaded
into the same context can interact directly with each other as well as with
the web content itself. See the section below on [content script
access](#content-script-access).

The add-on script and content script communicate by passing messages across
the process boundary rather than directly accessing each other's state.

The modules listed above, which we call _content modules_, define
a set of APIs to support working with content scripts. This section of the
tutorial provides a basic guide to these APIs.

The diagram below shows an overview of the main components and their
relationships. The gray fill represents code written by the add-on developer.

![Content script overview](media/content-scripting-overview.jpg)

This might sound complicated but it doesn't need to be. The following add-on
uses the [page-mod](#module/api-utils/page-mod) module to replace the
content of any web page in the `.co.uk` domain by executing a content script
in the context of that page:

    var pageMod = require("page-mod");

    pageMod.add(new pageMod.PageMod({
      include: ["*.co.uk"],
      contentScriptWhen: 'ready',
      contentScript: 'document.body.innerHTML = ' +
                     '"<h1>this page has been eaten</h1>";'
    }));

In this example the content script is supplied directly to the page mod via
the `contentScript` option in its constructor, and does not need to be
maintained as a separate file at all.

Loading content scripts
-----------------------
The constructors for content-script-using objects such as panel and page-mod
define a group of options for loading content scripts:

    contentScript      string, array
    contentScriptFile  string, array
    contentScriptWhen  string

We have already seen the `contentScript` option, which enables you to pass
in the text of the script itself as a string literal. This version of the API
avoids the need to maintain a separate file for the content script.

The `contentScriptFile` option enables you to pass in the local file URL from
which the content script will be loaded. To supply the file
"my-content-script.js", located in the /data subdirectory under your package's
root directory, use a line like:

    // "data" is supplied by the "self" module
    var data = require("self").data;
    ...
    contentScriptFile: data.url("my-content-script.js")

Both `contentScript` and `contentScriptFile` accept an array of strings, so you
can load multiple scripts, which can also interact directly with each other in
the content process:

    // "data" is supplied by the "self" module
    var data = require("self").data;
    ...
    contentScriptFile:
        [data.url("jquery-1.4.2.min.js"), data.url("my-content-script.js")]

Scripts specified using contentScriptFile are loaded before those specified
using contentScript. This enables you to load a JavaScript library like jQuery
by URL, then pass in a simple script inline that can use jQuery.

The `contentScriptWhen` option specifies when the content script(s) should be
loaded. It can take two values:

* "start" loads the scripts immediately after the document element for the
page is inserted into the DOM.

* "ready" loads the scripts after the DOM for the page has been loaded. If
your scripts need to access the DOM content you must specify "ready" here.

###<a name="content-script-access">Content script access</a>
Content scripts loaded into the same global execution context can interact
with each other directly as well as with the web content itself. However,
content scripts which have been loaded into different execution contexts
cannot interact with each other.

For example:

* if an add-on creates a single `panel` object and loads several content
scripts into the panel, then they can interact with each other

* if an add-on creates two `panel` objects and loads a script into each
one, they can't interact with each other.

* if an add-on creates a single `page-mod` object and loads several content
scripts into the page mod, then only content scripts associated with the
same page can interact with each other: if two different matching pages are
loaded, content scripts attached to page A cannot interact with those attached
to page B.

The web content has no access to objects created by the content script, unless
the content script explicitly makes them available.

Communicating with content scripts
----------------------------------
To enable add-on scripts and content scripts to communicate with each other
content modules support an API similar to the [Web Worker
API](https://developer.mozilla.org/En/Using_web_workers).

In this API each end of the conversation has a mechanism to send messages to
the other end, and a mechanism to define a function which be called when the
other end sends it a message.

Messages are asynchronous: that is, the sender does not wait for a reply from
the recipient but just sends the message and continues processing.

Because content modules expose Worker functionality in slightly different ways
we'll talk first about what the content script needs to do to support its end
of the conversation.

###Message handling in the content script
For a content script to be able to receive messages from the add-on script it
must register as a listener, specifying the function that will be called when
the add-on script sends it a message. It can do this by implementing the
global `onMessage` function:

    onMessage = function onMessage(message) {
      // Handle the message
    };

To send messages to the add-on the content script calls the global
`postMessage` function:

    postMessage(message);

The message itself can be any value that is serializable to JSON. For example:
a string, number, boolean, array of JSON-serializable values or an object
whose property values are JSON-serializable.

###Message handling in the add-on script
The worker API is not exposed to add-on code in quite the same way in all
modules. The panel and page objects integrate the worker API directly. So to
receive messages from a content script associated with a panel you can
register as a listener in its constructor:

    panel = require("panel").Panel({
      contentURL: "http://www.reddit.com/.mobile?keep_extension=True",
      contentScriptFile: data.url("panel.js"),
      contentScriptWhen: "ready",
      // Register the handleMessage function as a listener
      onMessage: function handleMessage(message) {
        // Handle the message
      }
    });

To send messages to a content script from a panel you can just call
`panel.postMessage()`.

The panel and page objects only host a single page at a time, so each distinct
page object only needs a single channel of communication to its content
scripts. But some modules, such as page-mod, might need to handle multiple
pages, each with its own context in which the content scripts are executing,
so it needs a separate channel for each page.

So page-mod does not integrate the worker API directly: instead, each time a
content script is attached to a page, the worker associated with the page is
supplied to the page-mod in its `onAttach` function. By supplying a target for
this function in the page-mod's constructor you can register to receive
messages from the content script, and take a reference to the worker so as to
post messages back to the content script:

    var myWorker;

    // Create a function to handle messages from the content script
    function handleMessage(message) {
      myWorker.postMessage("do not click this link again");
    }

    require("page-mod").PageMod({
      include: ["*"],
      contentScriptWhen: 'ready',
      contentScriptFile:  data.url("pagemod.js"),
      onAttach: function onAttach(worker, mod) {
        // Register the handleMessage function as a listener
        worker.on('message', handleMessage);
        // Take a reference to the worker so as to post messages back to it
        myWorker = worker;
      }
    });

###Examples###

####Reddit example####
This example add-on creates a panel containing the mobile version of Reddit.
When the user clicks on the title of a story in the panel, the add-on opens
the linked story in a new tab in the main browser window.

To accomplish this the add-on needs to run a content script in the context of
the Reddit page which  intercepts mouse clicks on title links and fetches the
link target's URL. The content script then needs to send the URL to the add-on
script.

This is the complete add-on script:

    const widgets = require("widget");
    const panels = require("panel");
    const data = require("self").data;

    widgets.Widget({
      label: "Reddit",
      image: "http://www.reddit.com/static/favicon.ico",
      panel: panels.Panel({
        width: 240,
        height: 320,
        contentURL: "http://www.reddit.com/.mobile?keep_extension=True",
        contentScriptFile: [data.url("jquery-1.4.2.min.js"),
                           data.url("panel.js")],
        contentScriptWhen: "ready",
        onMessage: function(message) {
          require("tabs").open(message);
        }
      })
    });

This code supplies two content scripts to the panel's constructor in the
contentScriptFile option: the jQuery library and the script that intercepts
mouse clicks.

It also supplies a function to the `onMessage` option which in turn passes the
`message` argument (the story URL) into the `open` function of the
[tabs](#module/addon-kit/tabs) module. This is the target for messages from all
content scripts associated with the panel.

This is the content script that intercepts the link clicks:

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
      postMessage(t.toString());
    });

This script uses jQuery to interact with the DOM of the page. The content
script uses `postMessage` to pass the URL back to the add-on script.

See the `examples/reddit-panel` directory for the complete example (including
the content script containing jQuery).
