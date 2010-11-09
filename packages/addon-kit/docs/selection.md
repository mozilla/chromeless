<!-- contributed by Eric H. Jung [eric.jung@yahoo.com] -->
<!-- contributed by Irakli Gozalishvili [gozala@mozilla.com] -->

The `selection` module provides a means to get and set text and HTML selections
in the current Firefox page.  It can also observe new selections.

It does not currently support selections inside `textarea` and `input` elements,
however.


Properties
----------

<api name="text">
@property {string}
  Gets or sets the current selection as plain text. Setting the selection
  removes all current selections, inserts the specified text at the location of
  the first selection, and selects the new text. Getting the selection when
  there is no current selection returns `null`. Setting the selection when there
  is no current selection throws an exception. Getting the selection when
  `contiguous` is `true` returns the text of the first selection.
</api>

<api name="html">
@property {string}
  Gets or sets the current selection as HTML. Setting the selection removes all
  current selections, inserts the specified text at the location of the first
  selection, and selects the new text. Getting the selection when there is no
  current selection returns `null`. Setting the selection when there is no
  current selection throws an exception. Getting the selection when `contiguous`
  is `true` returns the text of the first selection.
</api>

<api name="contiguous">
@property {boolean}
  `true` if the current selection is a single, contiguous selection, and `false`
  if there are two or more discrete selections, each of which may or may not be
  spatially adjacent. If there is no current selection, this property is `null`.
  (Discontiguous selections can be created by the user with
  Ctrl+click-and-drag.)
</api>

Registering for Selection Notifications
---------------------------------------

To be notified when the user makes a selection, register listener on 'select'
event. Each listener will be called after a selection is made.

    function myCallback() {
      console.log("A selection has been made.");
    }
    var selection = require("selection");
    selection.on('select', myCallback);
    
    // removing listeners
    selection.removeListener('select', myCallback);

Iterating Over Discontiguous Selections
---------------------------------------

Discontiguous selections can be accessed by iterating over the `selection`
module itself. Each iteration yields a `Selection` object from which `text`,
`html`, and `contiguous` properties can be accessed.


Examples
--------

Log the current contiguous selection as text:

    var selection = require("selection");
    if (selection.text)
      console.log(selection.text);

Log the current discontiguous selections as HTML:

    var selection = require("selection");
    if (!selection.contiguous) {
      for (var subselection in selection) {
         console.log(subselection.html);
      }
    }

Surround HTML selections with delimiters:

    var selection = require("selection");
    selection.on('select', function (selection) {
      selection.html = "\\\" + selection.html + "///";
    });

