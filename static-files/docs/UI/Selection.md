# Selection #

Jetpack's selection API provides a method for detecting the selections made by the user. Features can get, set, and listen for selection events in HTML or plain text.

The namespace for this api is `jetpack.selection`. This API currently lives in the [future][] and must be imported for use: `jetpack.future.import("selection");`
[future]: (https://wiki.mozilla.org/Labs/Jetpack/JEP/13)

## Getting and Setting the Selection ##

The current version of `jetpack.selection` includes these formats: `.text` and `.html`

### Getting the selection ###

The following is an example of getting the selection from the user.

~~~~{.javascript}
jetpack.import.future("selection");

var textOfSel = jetpack.selection.text;
var htmlOfSel = jetpack.selection.html;
~~~~

### Setting the selection ###

The following is an example of getting the selection from the user.

~~~~{.javascript}
jetpack.import.future("selection");

jetpack.selection.text = 'Hello';
jetpack.selection.html = '<b>Hello</b>';
~~~~

## Methods ##

== method ==
onSelection
: This method allows you to execute an event function when a selection is made.
== params ==
func
: A function to be called when the selection is made. This function receives no arguments. Use jetpack.selection.\*.
 * type: function

### Adding a selection event ###

~~~~{.javascript}
jetpack.selection.onSelection( fn );
~~~~

*Removal of a selection event*
~~~~{.javascript}
jetpack.selection.onSelection.unbind( fn );
~~~~

## Verbose Example ##

The following example will bold the html that you select.

~~~~{.javascript}
jetpack.import.future("selection");
jetpack.selection.onSelection(function(){
	var html = jetpack.selection.html;
	jetpack.selection.html = "<b>" + html + "</b>";
});
~~~~