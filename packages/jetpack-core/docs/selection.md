The `selection` module provides a means to get and set current text/HTML
selections, as well as observe new selections.

## Properties ##

<tt>selection.**text**</tt>

Gets or sets the current selection as plain text. Setting the selection
removes all current selections, inserts the specified text at the location
of the first selection, and selects the new text. Getting the selection when
there is no current selection returns <tt>null</tt>. Setting the selection
when there is no current selection throws an exception. Getting the selection
when **contiguous** is <tt>true</tt> returns the text of the first selection.

<tt>selection.**html**</tt>

Gets or sets the current selection as HTML. Setting the selection removes
all current selections, inserts the specified text at the location of the
first selection, and selects the new text. Getting the selection when there
is no current selection returns <tt>null</tt>. Setting the selection
when there is no current selection throws an exception. Getting the selection
when **contiguous** is <tt>true</tt> returns the text of the first selection.

<tt>selection.**contiguous**</tt>

Getter which returns <tt>true</tt> if the current selection is a single,
contiguous selection.  Returns <tt>false</tt> if there are two or more discrete
selections, each of which may or may not be spatially adjacent. If there is no
current selection, <tt>null</tt> is returned.  Discontiguous selections
can be created interactively with <tt>Ctrl+click-and-drag</tt>.

### Registering for Selection Notification ###

To be notified of selections, define one or more functions and assign them
to the **onSelect** property. Each function will be called back after a
selection is completed.

Usage for a single callback:

    selection.onSelect = function() {};

Adds the specified anonymous function to a list of callbacks which are called
when text/HTML is selected.

Usage for multiple callbacks:

    selection.onSelect = [function() {}, function() {}];

Adds the specified anonymous functions to a list of callbacks which are
called when text/HTML is selected.

<tt>selection.onSelect.**remove**(*callback*)</tt>

Removes *callback* from the list of callbacks which are called when text/HTML
is selected.

### Iterating Over Discontiguous Selections ###

Discontiguous selections can be accessed by iterating over
<tt>selection</tt>. Each iteration instance returns a <tt>Selection</tt> object
on which <tt>text</tt>, <tt>html</tt>, or <tt>contiguous</tt> may be called.

## Examples ##

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
    selection.onSelect.add(function() {
        selection.html = "\\\" + selection.html + "///";
    };

