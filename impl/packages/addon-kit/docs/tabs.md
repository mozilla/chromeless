<!-- contributed by Dietrich Ayala [dietrich@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->


The `tabs` module provides easy access to tabs and tab-related events.

Introduction
------------

Properties
----------

<api name="activeTab">
@property {object}

The currently active tab.  This property can be set to a `tab` object, which
will focus that tab's parent window and bring the tab to the foreground.
</api>

**Example**

    // get
    var tabs = require("tabs");
    console.log("title of active tab is " + tabs.activeTab.title);

    // set
    tabs.activeTab = anotherTab;

<api name="tabs">
@property {array}

The set of open tabs, across all open windows.
</api>

**Example**

    var tabs = require("tabs");
    for each (tab in tabs) {
      console.log(tab.title);
    }

Functions
---------

<api name="open">
@method
Open a new tab.

@param options {object}
An object containing configurable options for how and where the tab will be
opened, as well as a callback for being notified when the tab has fully opened.

If the only option being used is `url`, then a bare string URL can be passed to
`open` instead of adding at a property of the `options` object.

@prop [url] {string}
String URL to be opened in the new tab.
This is a required property.

@prop [inNewWindow] {boolean}
If present and true, a new browser window will be opened and the URL will be
opened in the first tab in that window. This is an optional property.

@prop [inBackground] {boolean}
If present and true, the new tab will be opened to the right of the active tab
and will not be active. This is an optional property.

@prop [onOpen] {function}
A callback function that is called when the tab has loaded. This does not mean
that the URL content has loaded, only that the browser tab itself is fully
visible to the user. This is an optional property.

</api>

**Example**

    var tabs = require("tabs");

    // open a new tab and make it active
    tabs.open("http://www.mysite.com");

    // in a new window
    tabs.open({
      url: "http://www.mysite.com",
      inNewWindow: true
    });

    // opened in the background
    tabs.open({
      url: "http://www.mysite.com",
      inBackground: true
    });

    // an onOpen listener
    tabs.open({
      url: "http://www.mysite.com",
      onOpen: function(tab) {
        // do stuff like listen for content
        // loading.
      }
    });

Events
------

Events representing common actions and state changes for tabs and their content.

These properties are both `collections` and setters. Listeners can be registered
by either assigning a callback function to any of these properties, or by
passing the callback to the properties' `add` method.  Listeners can be removed
by passing the callback function to the properties' `remove` method.

Listeners are passed the `tab` object that triggered the event.

<api name="onActivate">
@property {collection}
Fired when an inactive tab is made active.
</api>

<api name="onDeactivate">
@property {collection}
Fired when the active tab is made inactive.
</api>

<api name="onOpen">
@property {collection}
Fired when a new tab is opened. At this point the page has not finished loading,
so not all properties of the `tab` object passed to listeners will be available.
For example, `tab.location` will not be correct. Use `onReady` or `onLoad` to be
notified when the page has loaded.
</api>

<api name="onClose">
@property {collection}
Fired when a tab is closed.
</api>

<api name="onReady">
@property {collection}
Fired when a tab's content's DOM is ready.
This is equivalent to the DOMContentLoaded event
for the given content page.
</api>

<api name="onLoad">
@property {collection}
Fired for each load event in the tab's content page.
This can fire multiple times, for both content and images.
</api>

<api name="onPaint">
@property {collection}
Fired whenever a portion of the tab's content page is repainted.
</api>

**Examples**

    var tabs = require("tabs");

    // listen for tab openings via property assignment
    tabs.onOpen = function(tab) {
      myOpenTabs.push(tab);
    }

    // modify the DOM of the page when ready,
    // by adding listener to the event collection.
    tabs.onReady.add(function(tab) {
      tab.contentDocument.body.style.color = "red";
    });

Tab
----

A `tab` object represents a single open tab. It contains various tab
properties, several methods for manipulation, as well as per-tab event
registration.

<api name="title">
@property {string}
The title of the page currently loaded in the tab.
This property is read-only.
</api>

<api name="location">
@property {string}
The URL of the page currently loaded in the tab.
This property can be set, to load a different URL in the tab.
</api>

<api name="contentWindow">
@property {object}
The window object for the page currently loaded in the tab.
This property is read-only, meaning you cannot set it to different window.
The window itself can be modified.
</api>

<api name="contentDocument">
@property {object}
The document object for the page currently loaded in the tab.
This property is read-only, meaning you cannot set it to a different document.
The document itself can be modified.
</api>

<api name="favicon">
@property {string}
The URL of the favicon for the page currently loaded in the tab.
This property is read-only.
</api>

<api name="style">
@property {string}
The CSS style for the tab. NOT IMPLEMENTED YET.
</api>

<api name="index">
@property {integer}
The index of the tab relative to other tabs in the application window.
This property is read-only.
</api>

<api name="thumbnail">
@property {canvas}
A thumbnail of the page currently loaded in the tab.
This property is read-only.
</api>

<api name="close">
@method 
Close the tab.
</api>

<api name="move">
@method 
Move the tab to the specified index in its containing window.

@param index {number}
The index in the set of tabs to move the tab to. This is a zero-based index.
</api>

**Events**

Registration of event listeners per tab is supported for all events supported by
the `tabs` module except for `onOpen`. Tab opening events are available via
`tabs.onOpen` or for specific tabs via the `onOpen` parameter to `tabs.open()`.
The event listeners are not passed any parameters, as the caller will already
have the tab object on which the listener was registered.

**Examples**

    var tabs = require("tabs");

    // close the active tab
    tabs.activeTab.close();

    // move the active tab one position to the right
    tabs.activeTab.move(tabs.activeTab.index + 1);

    // open a tab, and listen for content loads
    tabs.open({
      url: "http://www.mozilla.com",
      onOpen: function(tab) {

        // listen for content loads
        tab.onReady = function() {
          console.log(tab.title);
        };
      }
    });
