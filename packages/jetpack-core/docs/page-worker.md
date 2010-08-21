<!-- contributed by Felipe Gomes [felipc@gmail.com] -->

The `page-worker` module provides a way to create a permanent, invisible
page and access its DOM.


Constructors
------------

<api name="Page">
@constructor
  Creates an uninitialized Page Worker instance.
@param [options] {object}
  The *`options`* parameter is optional, and if given it should be an object
  with any of the following keys:
  @prop [content] {string}
    A string which represents the initial content of the Page Worker. It can
    be either a URL to be loaded or a piece of HTML code to be used as the
    content for the page.
  @prop [onReady] {function,array}
    A function callback or an array of functions that will be called when
    the DOM on the page is ready. This can be used to know when your
    Page Worker instance is ready to be used, and also whenever the page
    is reloaded or another page is loaded in its place.
  @prop [allow] {object}
    An object with keys to configure the permissions of the Page Worker.
    The boolean key `script` controls if scripts from the page
    are allowed to run. Its default value is false.
</api>


Functions
---------

<api name="add">
@function
  Initialize the given Page Worker instance. You'll only be able to use its
  features after calling this function, which will define its properties
  as described in the Page Objects section below.
@param pageWorker {Page}
  The Page Worker instance to initialize.
</api>

<api name="remove">
@function
  Unload the given Page Worker instance. After you remove a Page Worker, its
  memory is freed and you must create a new instance if you need to load
  another page.
@param pageWorker {Page}
  The Page Worker instance to unload.
</api>


Page Objects
------------

Once they have been initialized by calling `add()`, Page Worker instances have
the following properties:

<api name="window">
@property {object}
  The `window` object of the page.
</api>

<api name="document">
@property {object}
  The `document` object of the page.
</api>

<api name="onReady">
@property {collection}
  A function callback or an array of functions that will be called when
  the DOM on the page is ready. This can be used to know when your
  Page Worker instance is ready to be used, and also whenever the page
  is reloaded or another page is loaded in its place.
</api>

<api name="content">
@property {string}
  A string which represents the content of the Page Worker. It can
  be either a URL to be loaded or a piece of HTML code to be used as the
  content for the page.
</api>

<api name="allow">
@property {object}
  An object with keys to configure the permissions on the Page Worker.
  The boolean key `script` controls if scripts from the page
  are allowed to run.
</api>


Examples
--------

### Print all header titles from a Wikipedia article ###

First, don't forget to import the module:

    var pageWorker = require("page-worker");

Then, create a page pointed to Wikipedia and add it
to the page workers:

    var page = pageWorker.Page({
      content: "http://en.wikipedia.org/wiki/Internet",
      onReady: printTitles
    });
    pageWorker.add(page);

And define the function to print the titles:

    function printTitles() {
      var elements = this.document.querySelectorAll("h2 > span");
      for (var i = 0; i < elements.length; i++) {
        console.log(elements[i].textContent);
      }
    }
