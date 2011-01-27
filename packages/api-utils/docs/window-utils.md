<!-- contributed by Drew Willcoxon [adw@mozilla.com] -->

The `window-utils` module provides helpers for accessing and tracking
application windows.  These windows implement the [`nsIDOMWindow`][nsIDOMWindow]
interface.

[nsIDOMWindow]: http://mxr.mozilla.org/mozilla-central/source/dom/interfaces/base/nsIDOMWindow.idl

<api name="WindowTracker">
@class
`WindowTracker` objects make it easy to "monkeypatch" windows when a program is
loaded and "un-monkeypatch" those windows when the program is unloaded.  For
example, if a Firefox add-on needs to add a status bar icon to all browser
windows, it can use a single `WindowTracker` object to gain access to windows
when they are opened and closed and also when the add-on is loaded and unloaded.

When a window is opened or closed, a `WindowTracker` notifies its delegate
object, which is passed to the constructor.  The delegate is also notified of
all windows that are open at the time that the `WindowTracker` is created and
all windows that are open at the time that the `WindowTracker` is unloaded.  The
caller can therefore use the same code to act on all windows, regardless of
whether they are currently open or are opened in the future, or whether they are
closed while the parent program is loaded or remain open when the program is
unloaded.

When a window is opened or when a window is open at the time that the
`WindowTracker` is created, the delegate's `onTrack()` method is called and
passed the window.

When a window is closed or when a window is open at the time that the
`WindowTracker` is unloaded, the delegate's `onUntrack()` method is called and
passed the window.  (The `WindowTracker` is unloaded when its its `unload()`
method is called, or when its parent program is unloaded, disabled, or
uninstalled, whichever comes first.)

**Example**

    var delegate = {
      onTrack: function (window) {
        console.log("Tracking a window: " + window.document.URL);
        // Modify the window!
      },
      onUntrack: function (window) {
        console.log("Untracking a window: " + window.document.URL);
        // Undo your modifications!
      }
    };
    var winUtils = require("window-utils");
    var tracker = new winUtils.WindowTracker(delegate);

<api name="WindowTracker">
@constructor
  A `WindowTracker` object listens for openings and closings of application
  windows.
@param delegate {object}
  An object that implements `onTrack()` and `onUntrack()` methods.
</api>
</api>

<api name="windowIterator">
@function
  An iterator for windows currently open in the application.

**Example**

    var winUtils = require("window-utils");
    for (window in winUtils.windowIterator())
      console.log("An open window! " + window.document.URL);

</api>

<api name="closeOnUnload">
@function
  Marks an application window to be closed when the program is unloaded.
@param window {window}
  The window to close.
</api>
