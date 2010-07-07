<!-- contributed by Drew Willcoxon [adw@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->

The `context-menu` module allows you to add items to Firefox's page context
menu.


Introduction
------------

The `context-menu` API provides a simple, declarative way to add items to the
page's context menu.  You can add items that perform an action when clicked,
submenus, and menu separators.

Instead of manually adding items when particular contexts occur and then
removing them when those contexts go away, you *bind* items to contexts, and the
adding and removing is automatically handled for you.

Items are bound to contexts in much the same way that event listeners are bound
to events.  When the user invokes the context menu, all of the items bound to
the current context are automatically added to the menu.  If no items are bound,
none are added.  Likewise, any items that were previously in the menu but are
not bound to the current context are automatically removed from the menu.  You
never need to manually remove your items from the menu unless you want them to
never appear again.

For example, if your extension needs to add a context menu item whenever the
user visits a certain URL, don't add the item when that URL loads, and don't
remove the item when the URL unloads.  Rather, add your item only once, when
your program starts, and supply a context that matches the target URL.


Specifying Contexts
-------------------

As its name implies, the context menu should be reserved for the occurrence of
specific contexts.  Contexts can be related to page content or the page itself,
but they should never be external to the page.  For example, a good use of the
menu would be to show an "Edit Image" item when the user right-clicks an image
in the page.  A bad use would be to show a submenu that listed all the user's
tabs, since tabs aren't related to the page or the node the user clicked to open
the menu.

The binding of a menu item to a context occurs through the item's `context`
property and the `context` options key passed to its constructor.

Contexts may be specified with any of the following types:

<table>
  <tr>
    <td>string</td>
    <td>
      A CSS selector.  This context occurs when the menu is invoked on a node
      that either matches this selector or has an ancestor that matches.
    </td>
  </tr>
  <tr>
    <td>undefined or null</td>
    <td>
      The page context.  This context occurs when the menu is invoked on a
      non-interactive portion of the page.  For example, right-clicking plain
      text triggers the page context but an image or hyperlink doesn't.
    </td>
  </tr>
  <tr>
    <td>function</td>
    <td>
      An arbitrary predicate.  This context occurs when the function returns
      true.  The function is passed an object describing the current context,
      which it can use to determine if the predicate is true.  See Examining
      Contexts below for details.
    </td>
  </tr>
  <tr>
    <td>array</td>
    <td>
      An array of any of the other types.  This context occurs when any context
      in the array occurs.
    </td>
  </tr>
</table>

A menu item's `context` property is a collection, similar to event listener
collections common throughout Jetpack's APIs.  A single context may be bound by
assigning a scalar either on creation or after:

    var contextMenu = require("context-menu");
    var item = contextMenu.Item({ context: "img" });
    item.context = "img";

Multiple contexts may be bound by assigning an array:

    item = contextMenu.Item({ context: ["img", "a[href]"] });
    item.context = ["img", "a[href]"];

You can add more bindings:

    item.context.add("img");
    item.context.add(["img", "a[href]"]);

And remove them:

    item.context.remove("img");
    item.context.remove(["img", "a[href]"]);

When a menu item is bound to more than one context, it appears in the menu when
any of those contexts occur.


Examining Contexts
------------------

Menu item callbacks like `onClick` often need to examine the context in which
the menu was invoked.  For example, an item that edits images needs to know the
URL of the image on which the user invoked the context menu.

Callbacks are therefore passed an object describing the current context.  It has
the following properties:

<table>
  <tr>
    <td><code>node</code></td>
    <td>
     The node the user clicked to invoke the menu.
    </td>
  </tr>
  <tr>
    <td><code>document</code></td>
    <td>
     The document containing <code>node</code> (i.e.,
     <code>node.ownerDocument</code>).
    </td>
  </tr>
  <tr>
    <td><code>window</code></td>
    <td>
     The window containing <code>document</code> (i.e.,
     <code>node.ownerDocument.defaultView</code>).
    </td>
  </tr>
</table>


Item Constructors
-----------------

<api name="Item">
@constructor
  Creates a labeled menu item that can perform an action when clicked.
@param options {object}
  An object with the following keys:
  @prop label {string}
    The item's label.  It must either be a string or an object that implements
    `toString()`.
  @prop [data] {string}
    An optional arbitrary value to associate with the item.  It must be either a
    string or an object that implements `toString()`.
  @prop [onClick] {callback}
    An optional function that will be called when the Item is clicked.  It's
    called as `onClick(contextObj, item)`.  `contextObj` is an object describing
    the context in which the context menu was invoked; see Examining Contexts
    above.  `item` is the item itself.
  @prop [context] {object}
    If the item is added to the top-level context menu, this specifies the
    context under which the item will appear; see Specifying Contexts above.
    Ignored if the item is contained in a submenu.
</api>

<api name="Menu">
@constructor
  Creates a menu item that expands into a submenu.
@param options {object}
  An object with the following keys:
  @prop label {string}
    The item's label.  It must either be a string or an object that implements
    `toString()`.
  @prop [items] {string}
    An array of menu items that the menu will contain.  Each must be an `Item`,
    `Menu`, or `Separator`.
  @prop [onClick] {callback}
    An optional function that will be called when any of the menu's `Item`
    descendants is clicked. (The `onClick`s of descendants are invoked first, in
    a bottom-up, bubbling manner.)  It is called as
    `onClick(contextObj, item)`. `contextObj` is an object describing the
    context in which the context menu was invoked; see Examining Contexts above.
    `item` is the item that was clicked.
  @prop [context] {object}
    If the item is added to the top-level context menu, this specifies the
    context under which the item will appear; see Specifying Contexts above for
    details.  Ignored if the item is contained in a submenu.
</api>

<api name="Separator">
@constructor
  Creates a menu separator.  Separators can only be contained in `Menu`s; they
  can't be added to the top-level context menu.
</api>


Context Menu Functions
----------------------

<api name="add">
@function
  Adds a menu item to the context menu.
@param item {object}
  An `Item` or `Menu` object to be added to the context menu.  `Separator`s
  can't be added to the top-level menu.
</api>

<api name="remove">
@function
  Permanently removes a menu item from the context menu.  The item must have
  been previously added.
@param item {object}
  An `Item` or `Menu` object that was previously added.
</api>


Examples
--------

Each of these examples can be added to the top-level context of your program;
you don't need to manually remove or add these items other than the single call
to `add()` in each example.  See the Introduction above for more information.

First, don't forget to import the module:

    var contextMenu = require("context-menu");

Show an "Edit Page Source" item when the user right-clicks a non-interactive
part of the page:

    var pageSourceItem = contextMenu.Item({
      label: "Edit Page Source",
      onClick: function (contextObj, item) {
        editSource(contextObj.document.URL);
      }
    });
    contextMenu.add(pageSourceItem);

Show an "Edit Image" item when the menu is invoked on an image:

    var imgCssSelector = "img";
    var editImageItem = contextMenu.Item({
      label: "Edit Image",
      onClick: function (contextObj, item) {
        var img = contextObj.node;
        editImage(img.src);
      },
      context: imgCssSelector
    });
    contextMenu.add(editImageItem);

Show an "Edit Page Images" item when the page contains at least one image:

    function pageHasImages(contextObj) {
      return !!contextObj.document.querySelector("img");
    }
    var editImagesItem = contextMenu.Item({
      label: "Edit Page Images",
      onClick: function (contextObj, item) {
        var imgNodes = contextObj.document.querySelectorAll("img");
        editImages(imgNodes);
      },
      context: pageHasImages
    });
    contextMenu.add(editImagesItem);

Show a "Search With" menu when the user right-clicks an anchor that searches
Google or Wikipedia with the text contained in the anchor:

    var googleItem = contextMenu.Item({
      label: "Google",
      data: "http://www.google.com/search?q="
    });
    var wikipediaItem = contextMenu.Item({
      label: "Wikipedia",
      data: "http://en.wikipedia.org/wiki/Special:Search?search="
    });
    var anchorSelector = "a[href]";
    var searchMenu = contextMenu.Menu({
      label: "Search With",
      onClick: function (contextObj, item) {
        var anchor = contextObj.node;
        var searchUrl = item.data + anchor.textContent;
        contextObj.window.location.href = searchUrl;
      },
      context: anchorSelector,
      items: [googleItem, wikipediaItem]
    });
    contextMenu.add(searchMenu);
