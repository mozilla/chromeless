The `page-worker` module provides a way to create a permanent, invisible
page and access its DOM.

## Initialization and usage ##

<code>`require`(*"page-worker"*).**Page**(*options*)</code>

Creates an uninitialized Page Worker instance.

The `options` parameter is optional, and if given it should be an object
with any of the following keys:

<table>
  <tr>
    <td><code>content</code></td>
    <td>
      A string which represents the initial content of the Page Worker. It can
      be either an URL to be loaded or a piece of HTML code to be used as the
      content for the page.
    </td>
  </tr>
  <tr>
    <td><code>onReady</code></td>
    <td>
      A function callback or an array of functions that will be called when
      the DOM on the page is ready. This can be used to know when your
      Page Worker instance is ready to be used, and also whenever the page
      is reloaded or another page is loaded in its place.
    </td>
  </tr>
    <tr>
    <td><code>allow</code></td>
    <td>
      An object with keys to configure the permissions on the Page Worker.
      The boolean key "script" controls if scripts from the page
      are allowed to run. The default value is false.
    </td>
  </tr>

</table>

<code>`require`(*"page-worker"*).**add**(*Page Worker*)</code>

Initialize the given Page Worker instance. You'll only be able to use its
features after calling this function, which will define its properties
as described in the API reference below.

<code>`require`(*"page-worker"*).**remove**(*Page Worker*)</code>

Unload the given Page Worker instance. After you remove a Page Worker, its
memory is freed and you must create a new instance if you need to load
another page.

## Properties ##

<code>page.**window**</code>

The `window` object of the page

<code>page.**document**</code>

The `document` object of the page

<code>page.**onReady**</code>

A function callback or an array of functions that will be called when
the DOM on the page is ready. This can be used to know when your
Page Worker instance is ready to be used, and also whenever the page
is reloaded or another page is loaded in its place.

<code>page.**content**</code>

A string which represents the content of the Page Worker. It can
be either an URL to be loaded or a piece of HTML code to be used as the
content for the page.

<code>page.**allow**</code>
An object with keys to configure the permissions on the Page Worker.
The boolean key "script" controls if scripts from the page
are allowed to run.


## Examples ##

### Example - Print all header titles from a Wikipedia article ###

First, don't forget to import the module:

    var PageWorker = require("page-worker");
    
Then, create a page pointed to Wikipedia and add it
to the page workers:

    var page = PageWorker.Page({
      content: "http://en.wikipedia.org/wiki/Internet",
      onReady: printTitles
    });
    PageWorker.add(page);

And define the function to print the titles:

    function printTitles() {
      var elements = this.document.querySelectorAll("h2 > span");
      for (var i = 0; i < elements.length; i++) {
        console.log(elements[i].textContent);
      }
    }
