<!-- contributed by Dietrich Ayala [dietrich@mozilla.com]  -->

The `clipboard` module allows callers to interact with the system clipboard,
setting and retrieving its contents.

You can optionally specify the type of the data to set and retrieve.
The following types are supported:

* `text` (plain text)
* `html` (a string of HTML)

If no data type is provided, then the module will detect it for you.

Examples
--------

Set and get the contents of the clipboard.

    let clipboard = require("clipboard");
    clipboard.set("Lorem ipsum dolor sit amet");
    let contents = clipboard.get();

Set the clipboard contents to some HTML.

    let clipboard = require("clipboard");
    clipboard.set("<blink>Lorem ipsum dolor sit amet</blink>", "html");

If the clipboard contains HTML content, open it in a new tab.

    let clipboard = require("clipboard");
    if (clipboard.currentFlavors.indexOf("html") != -1)
      require("tabs").open("data:text/html," + clipboard.get("html"));

<api name="set">
@function
  Replace the contents of the user's clipboard with the provided data.
@param data {string}
  The data to put on the clipboard.
@param [datatype] {string}
  The type of the data (optional).
</api>

<api name="get">
@function
  Get the contents of the user's clipboard.
@param [datatype] {string}
  Retrieve the clipboard contents only if matching this type (optional).
  The function will return null if the contents of the clipboard do not match
  the supplied type.
</api>

<api name="currentFlavors">
@property {array}
  Data on the clipboard is sometimes available in multiple types. For example,
  HTML data might be available as both a string of HTML (the `html` type)
  and a string of plain text (the `text` type). This function returns an array
  of all types in which the data currently on the clipboard is available.
</api>
