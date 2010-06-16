<!-- contributed by Dietrich Ayala [dietrich@mozilla.com]  -->

The `tab-browser` module is a low-level API that provides privileged
access to browser tab events and actions.

Introduction
------------

The `tab-browser` module contains helpers for tracking tabbrowser elements
and tabs, as well as a few utilities for actions such as opening a new
tab, and catching all tab content loads.

This is a low-level API that has full privileges, and is intended to be used
by SDK internal modules. If you just need easy access to tab events for your
add-on, use the Tabs module (JEP 110).

<api name="activeTab">
@property {element}
The XUL tab element of the currently active tab.
</api>

Functions
---------

<api name="addTab">
@method
Adds a new tab.

@returns {element}
The XUL tab element of the newly created tab.

@param URL {string}
The URL to be opened in the new tab.

@param options {object}
Options for how and where to open the new tab.

@prop [inNewWindow] {boolean}
An optional parameter whose key can be set in `options`.
If true, the tab is opened in a new window. Default is false.

@prop [openInBackground] {boolean}
An optional parameter whose key can be set in `options`.
If true, the tab is opened adjacent to the active tab, but not
switched to. Default is false.

@prop [onLoad] {function}
An optional parameter whose key can be set in `options`.
A callback function that is called once the tab has loaded.
The XUL element for the tab is passed as a parameter to
this function.
</api>

**Example**

    const tabBrowser = require("tab-browser");
    tabBrowser.addTab("http://google.com");

    const tabBrowser = require("tab-browser");
    tabBrowser.addTab("http://google.com", {
      openInBackground: true
    });

    const tabBrowser = require("tab-browser");
    tabBrowser.addTab("http://google.com", {
      inNewWindow: true,
      onLoad: function(tab) {
        console.log("tab is open.");
      }
    });

<api name="Tracker">
@method
Register a delegate object to be notified when tabbrowsers are created
and destroyed.

@param delegate {object}
Delegate object to be notified each time a tabbrowser is created or destroyed.
The object should contain the following methods:

@prop [onTrack] {function}
Method of delegate that is called when a new tabbrowser starts to be tracked.
The tabbrowser element is passed as a parameter to this method.

@prop [onUntrack] {function}
Method of delegate that is called when a tabbrowser stops being tracked.
The tabbrowser element is passed as a parameter to this method.
</api>

The onTrack method will be called once per pre-existing tabbrowser, upon
tracker registration.

**Example**

    const tabBrowser = require("tab-browser");
    let tracker = {
      onTrack: function(tabbrowser) {
        console.log("A new tabbrowser is being tracked.");
      },
      onUntrack: function(tabbrowser) {
        console.log("A tabbrowser is no longer being tracked.");
      }
    };
    tabBrowser.Tracker(tracker);

<api name="TabTracker">
@method
Register a delegate object to be notified when tabs are opened and closed. 

@param delegate {object}
Delegate object to be notified each time a tab is opened or closed.
The object should contain the following methods:

@prop [onTrack] {function}
Method of delegate that is called when a new tab starts to be tracked.
The tab element is passed as a parameter to this method.

@prop [onUntrack] {function}
Method of delegate that is called when a tab stops being tracked.
The tab element is passed as a parameter to this method.
</api>

The onTrack method will be called once per pre-existing tab, upon
tracker registration.

**Example**

    const tabBrowser = require("tab-browser");
    let tracker = {
      onTrack: function(tab) {
        console.log("A new tab is being tracked.");
      },
      onUntrack: function(tab) {
        console.log("A tab is no longer being tracked.");
      }
    };
    tabBrowser.TabTracker(tracker);
