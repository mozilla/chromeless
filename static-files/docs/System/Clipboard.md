# Clipboard #

Jetpack's clipboard support API provides a standardized way for features to access the clipboard. Features can get and set the clipboard in various flavors of data type.

The namespace associated with this API is jetpack.clipboard which provides both read and write access to the clipboard. The API is fairly straightforward; examples can be found here.

This API currently lives in the [future][] and must be imported for use.
[future]: (https://wiki.mozilla.org/Labs/Jetpack/JEP/13)

`jetpack.future.import("clipboard");`

## Methods ##

== method ==
set
:  Writes data from Jetpack to the clipboard. This is the recommended method
   of copying data to the clipboard.
   * returns: string
== params ==
content
:  The content to be copied to the clipboard. If no other arguments are
   specified, the flavor of the content is assumed to 'plain'.
   *  type:string
   *  required:true
flavor
:   Data type. This is an optional parameter. The only flavors currently
    implemented are 'plain' (text/unicode) and 'html' (which is HTML).
    *  type:string
    *  default:"text"
    *  required:false

Here's an example of how to use the method to set the clipboard.

~~~~{.javascript}
jetpack.import.future("clipboard");
// In text format
jetpack.clipboard.set("Hello World");
// In other clipboard
~~~~  

== method ==
get
:  Returns data to Jetpack from the clipboard. If flavor is provided, the data
   is returned in that format.
== params ==
flavor
:  Returns data to Jetpack from the clipboard. If flavor is provided, the data 
   is returned in that format.
   * type: string
   * required: false

Here's an example of how to use the method to get the data on the clipboard. Remember to import clipboard from the future before calling it.

~~~~{.javascript}
jetpack.import.future("clipboard");
var myContent = "<i>This is some italic text</i>";
jetpack.clipboard.set( myContent, "html" );
~~~~

== method ==
getCurrentFlavors
:  Returns an array of available Jetpack clipboard flavors, for the current
   system clipboard state.


~~~~{.javascript}
jetpack.import.future("clipboard");

var myContent = "<i>This is some italic text</i>";
jetpack.clipboard.set( myContent, "html" );

var flavs = jetpack.clipboard.getClipboardFlavors();
// Should equal ["html", "text"]
console.log( flavs );
~~~~
