The `context-menu` module allows you to add and remove items to and from the browser's page context menu.

## Constructors ##

<tt>contextMenu.**Item**(*options*)</tt>

Creates a labeled menu item that can perform an action when clicked.  *options*
is an object with the following keys.  If any option is invalid, an exception is
thrown.

<table>
  <tr>
    <td><tt>label</tt></td>
    <td>
      The item's label.  It must be either a string or an object that implements
      <tt>toString()</tt>.
    </td>
  </tr>
  <tr>
    <td><tt>data</tt></td>
    <td>
      An optional arbitrary value to associate with the item.  It must be either
      a string or an object that implements <tt>toString()</tt>.
    </td>
  </tr>
  <tr>
    <td><tt>onClick</tt></td>
    <td>
      An optional function that will be called when the item is clicked.  It is
      called as <tt>onClick(<em>contextObj</em>, <em>item</em>)</tt>.
      <em>contextObj</em> is an object describing the context in which the menu
      was invoked.  See Examining Contexts below for details.  <em>item</em>
      is the item itself.
    </td>
  </tr>
  <tr>
    <td><tt>context</tt></td>
    <td>
      If the item is added to the top-level context menu, this specifies the
      context under which the item will appear.  If undefined, the page context
      is assumed.  See Specifying Contexts below for details.  It's ignored if
      the item is contained in a <tt>Menu</tt>.
    </td>
  </tr>
</table>

<tt>contextMenu.**Menu**(*options*)</tt>

Creates a menu item that expands into a submenu.  *options* is an object with
the following keys.  If any option is invalid, an exception is thrown.

<table>
  <tr>
    <td><tt>label</tt></td>
    <td>
      The menu's label.  It must be either a string or an object that implements
      <tt>toString()</tt>.
    </td>
  </tr>
  <tr>
    <td><tt>items</tt></td>
    <td>
      An array of menu items that the menu will contain.  Each must be an
      <tt>Item</tt>, <tt>Menu</tt>, or <tt>Separator</tt>.
    </td>
  </tr>
  <tr>
    <td><tt>onClick</tt></td>
    <td>
      An optional function that will be called when any of the menu's descendant
      <tt>Item</tt>s is clicked.  (The <tt>onClick</tt>s of descendants are
      invoked first, in a bottom-up, bubbling manner.)  It is called as
      <tt>onClick(<em>contextObj</em>, <em>item</em>)</tt>.  <em>contextObj</em>
      is an object describing the context in which the context menu was invoked.
      See Examining Contexts below for details.  <em>item</em> is the
      <tt>Item</tt> that was clicked.
    </td>
  </tr>
  <tr>
    <td><tt>context</tt></td>
    <td>
      If the menu is added to the top-level context menu, this specifies the
      context under which the menu will appear.  If undefined, the page context
      is assumed.  See Specifying Contexts below for details.  It's ignored if
      the menu is contained in a <tt>Menu</tt>.
    </td>
  </tr>
</table>

<tt>contextMenu.**Separator**()</tt>

Creates a menu separator.  Separators can only be contained in `Menu`s; they
can't be added to the top-level context menu.


## Functions ##

<tt>contextMenu.**add**(*item*)</tt>

Adds a menu item to the context menu.  *item* is an `Item` or `Menu`.
`Separator`s can't be added to the top-level menu; an exception is thrown if
attempted.

<tt>contextMenu.**remove**(*item*)</tt>

Removes a menu item from the context menu.  *item* must have been previously
added.  An exception is thrown if *item* was never added.


## Specifying Contexts ##

As its name implies, the context menu should be reserved for the occurrence of
specific contexts.  Contexts can be related to page content or the page itself,
but they should never be external to the page.  For example, a good use of the
menu would be to show an "Edit Image" item when the user right-clicks an image
in the page.  A bad use would be to show a submenu that listed all the user's
tabs, since tabs aren't related to the page or the node the user clicked to open
the menu.

Rather than adding and removing menu items when particular contexts occur, you
*bind* menu items to contexts, and Jetpack handles the adding and removing for
you.  Menu items are bound to contexts in much the same way that event listeners
are bound to events.  When the user invokes the context menu, all of the menu
items bound to the current context are added to the menu.  If no menu items are
bound, none are added.  Binding occurs through a menu item's `context` property
and the `context` options key passed to its constructor.

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
      text triggers the page context, but an image or hyperlink doesn't.
    </td>
  </tr>
  <tr>
    <td>function</td>
    <td>
      An arbitrary predicate.  This context occurs when the function returns
      true.  The function is passed an object describing the current context.
      See Examining Contexts below for details.
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


## Examining Contexts ##

Menu item callbacks like `onClick` often need to examine the context in which
the menu was invoked.  For example, an item that edits images needs to know the
URL of the image that the user right-clicked.

Callbacks are therefore passed an object describing the current context.  It has
the following properties:

<table>
  <tr>
    <td><tt>node</tt></td>
    <td>
     The node the user clicked to invoke the menu.
    </td>
  </tr>
  <tr>
    <td><tt>document</tt></td>
    <td>
     The document containing <tt>node</tt> (i.e., <tt>node.ownerDocument</tt>).
    </td>
  </tr>
  <tr>
    <td><tt>window</tt></td>
    <td>
     The window containing <tt>document</tt> (i.e.,
     <tt>node.ownerDocument.defaultView</tt>).
    </td>
  </tr>
</table>


## Examples ##

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
