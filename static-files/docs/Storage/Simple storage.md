# Simple Storage #

The `jetpack.storage.simple` namespace provides an easy way to persist data across browser restarts.  It's a simple key-based persistent object data store.

Simple storage is really simple.  `jetpack.storage.simple` is a single, persistent JavaScript object private to each jetpack.  For the most part this object is like any other JavaScript object, and a jetpack can set whatever properties it wants on it.  To manipulate its persistent data, a jetpack therefore need only use the various standard [JavaScript functions and operators][1].

The `jetpack.simple.storage` object is automatically and periodically flushed to disk.  How and when it is flushed is an implementation detail.  Jetpacks can flush it manually, however, by calling `jetpack.storage.simple.sync()`.  The object can also be forced to reload its data from disk by calling `jetpack.storage.simple.open()`, although the data comes loaded automatically.  *Don't abuse these methods*, since they cause Firefox -- all of Firefox -- to drop what it's doing to make a trip to the disk.  If you call them too often, Firefox may become unresponsive for some of your users.  Unless you are doing something strange, let Jetpack flush your data for you.

The namespace currently lives in [the future][2] and must be imported before it is used:

[1]: https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference
[2]: https://developer.mozilla.org/en/Jetpack/Meta/Future

~~~~{.javascript}
jetpack.future.import("storage.simple"); 
~~~~

## Methods ##

== method ==
sync
: As described above, the jetpack.storage.simple object is automatically 
  written to disk, but a feature may force flush by calling
  jetpack.storage.simple.sync(). **Don't abuse this method.**
  
== method ==
open
:  As described above, the jetpack.storage.simple object is automatically
   populated when a feature is loaded, but a feature may force the object to 
   read from disk by calling jetpack.storage.simple.open(). **Don't abuse this 
   method.**
   
   
## Examples ##

This code persistently stores some data:

~~~~{.javascript}
jetpack.future.import("storage.simple");
var myStorage = jetpack.storage.simple;
myStorage.fribblefrops = [1, 3, 3, 7];
myStorage.heimelfarbs = { bar: "baz" };
~~~~

And this code -- pretend it's in the same jetpack as the code above -- simply uses that data:

~~~~{.javascript}
myStorage.fribblefrops.forEach(function (elt) console.log(elt));
var bar = myStorage.heimelfarbs.bar;
jetpack.notifications.show(bar.baz);
~~~~

That's all there is to it!  Note that these examples create a myStorage  variable to emphasize the fact that jetpack.storage.simple  is just a normal JavaScript object.  They could have simply used jetpack.storage.simple  directly.

Here's a complete real-world example.  It's a simple note-taking jetpack.  Select some text on the page, right-click, and select Note.  The text will be remembered across browser restarts as a note.  All notes are shown in the Tools menu.  You can install this example from the [Jetpack Gallery][3].

[3]: http://jetpackgallery.mozillalabs.com/jetpacks/245

~~~~{.javascript}
jetpack.future.import("menu");
jetpack.future.import("selection");
jetpack.future.import("storage.simple");

// Create the persistent notes array if it doesn't already exist.
jetpack.storage.simple.notes = jetpack.storage.simple.notes || [];
var notes = jetpack.storage.simple.notes;

// Updates the Jetpack menu with the current notes.  We'll add a Notes menu with
// a submenu, which lists all the notes.  If there are no notes, we'll show a
// disabled "(Empty)" menuitem.
function updateJetpackMenu() {
  jetpack.menu.set({
    label: "Notes",
    menu: new jetpack.Menu(notes.length > 0 ?
                           notes :
                           [{ label: "(Empty)", disabled: true }])
  });
}

// Modify the page's context menu by sneaking in before it's shown.  If there's
// a selection, add a Note menuitem that makes a new note.  Otherwise, don't
// modify the menu at all.  We'll limit the number of notes to 20.  Old notes
// will be forgotten. :(
jetpack.menu.context.page.beforeShow = function (menu) {
  menu.reset();
  if (jetpack.selection.text)
    menu.add({
      label: "Note",
      command: function () {
        notes.unshift(jetpack.selection.text);
        if (notes.length > 20)
          notes.pop();
        updateJetpackMenu();
      }
    });
};

// Initialize the Jetpack menu with the current notes.
updateJetpackMenu();
~~~~

## See Also ##

* [Settings](https://developer.mozilla.org/en/Jetpack/Storage/Settings)
* [JEP 11](https://wiki.mozilla.org/Labs/Jetpack/JEP/11)

