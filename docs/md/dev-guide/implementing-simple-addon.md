This section of the tutorial takes you through the process of implementing,
running and packaging a simple add-on using the SDK. The add-on will add a
menu item to Firefox's context menu that replaces selected text with its
English translation.

## Initializing Your Add-on ##

Create a directory called `translator`. This is where we will keep all the
files for this add-on.

You *do not* have to create this directory under the SDK root: once you have
called `source bin/activate` from the SDK root, `cfx` will remember where the
SDK is, and you will be able to reference SDK packages from any directory.

Keeping your add-on code outside the SDK is good practice as it makes it easier
for you to update the SDK and to manage your code using a version control
system.

Next we'll use `cfx init` to create a skeleton structure for your add-on.
Navigate to the `translator` directory and execute `cfx init`. You should see
something like this:

<pre>
  * lib directory created
  * data directory created
  * tests directory created
  * docs directory created
  * README.md written
  * package.json written
  * tests/test-main.js written
  * lib/main.js written
  * docs/main.md written

  Your sample add-on is now ready for testing:
      try "cfx test" and then "cfx run". Have fun!"
</pre>

First, `cfx init` creates the directory structure your add-on needs:

* `/data` contains resources such as icons or strings. You can access the
content of the `data` subdirectory from within your add-on's code using the
Add-on SDK's [`self`](#module/api-utils/self) module.

<span class="aside">*Note that until bug
[614712](https://bugzilla.mozilla.org/show_bug.cgi?id=614712) is fixed, cfx
expects this to be `/docs`.*</span>

* `/doc` contains any documentation for your add-on.

* `/lib` contains the JavaScript modules implementing your add-on.

<span class="aside">*Note that until bug
[614712](https://bugzilla.mozilla.org/show_bug.cgi?id=614712) is fixed, cfx
expects this to be `/tests`.*</span>

* `/test` contains unit test code.

Next, `cfx init` creates a file called `package.json` in the root `translator`
directory. This contains information about your add-on and should look
something like this:

<pre>
{
    "name":"translator",
    "fullName":"translator",
    "description":"This is an example of addon description.",
    "author":"",
    "license":"MPL",
    "version":"0.1"
}
</pre>

Finally, `cfx init` creates some example files under `docs`, `lib`, and
`tests`: we will replace those.

## Adding Your Code ##

In the `lib` directory, open the file called `main.js` and replace its
contents with the following:

    // Import the APIs we need.
    var contextMenu = require("context-menu");
    var request = require("request");
    var selection = require("selection");

    // Create a new context menu item.
    var menuItem = contextMenu.Item({

      label: "Translate Selection",

      // Show this item when a selection exists.
      context: contextMenu.SelectionContext(),

      // When this item is clicked, post a message to the item with the
      // selected text and current URL.
      contentScript: 'on("click", function () {' +
                     '  var text = window.getSelection().toString();' +
                     '  postMessage(text);' +
                     '});',

      // When we receive the message, call the Google Translate API with the
      // selected text and replace it with the translation.
      onMessage: function (text) {
          if (text.length == 0) {
            throw ("Text to translate must not be empty")
          }
        console.log("input: " + text)
        var req = request.Request({
          url: "http://ajax.googleapis.com/ajax/services/language/translate",
          content: {
            v: "1.0",
            q: text,
            langpair: "|en"
          },
          onComplete: function (response) {
            translated = response.json.responseData.translatedText;
            console.log("output: " + translated)
            selection.text = translated;
          }
        });
        req.get();
      }
    });


The first three lines are used to import three SDK modules from the
addon-kit package:

* [`context-menu`](#module/addon-kit/context-menu) enables add-ons to
add new items to the context menu

* [`request`](#module/addon-kit/request) enables add-ons to make
network requests

* [`selection`](#module/addon-kit/selection) gives add-ons access to
selected text in the active browser window

Next, this code constructs a context menu item. It supplies:

* the name of the item to display: "Translate Selection"

* a context in which the item should be displayed: `SelectionContext()`,
meaning: include this item in the context menu whenever some content on the
page is selected

* a script to execute when the item is clicked: this script sends the selected
text to the function assigned to the `onMessage` property

* a value for the `onMessage` property: this function will now be called with
the selected text, whenever the user clicks the menu. It uses Google's
AJAX-based translation service to translate the selection to English and sets
the selection to the translated text.

Finally, note the two calls to `console.log()` here. `console` is a global
object accessible by any module and is very useful for debugging.
`console.log(message)` writes `message` to the console. For more
information on the globals available to your code see the
[Globals](#guide/globals) reference section.

## Running It ##

To run your program, navigate to the `translator` directory and type:

<pre>
  cfx run
</pre>

The first time you do this, you'll see a message like this:

<pre>
  No 'id' in package.json: creating a new keypair for you.
  package.json modified: please re-run 'cfx run'
</pre>

Run it again, and it will run an instance of Firefox with your add-on
installed.

The ID that `cfx` generated the first time you executed `cfx run` is a unique
identifier for you add-on called the **Program ID** and it is important. It is
used by various tools and services to distinguish this add-on from any other.

To learn more about the Program ID refer to the [Program ID](#guide/program-id)
document.

Once `cfx run` has launched Firefox you can try out the new add-on. Load a
page containing some text that is not in English, for example:
[http://www.mozilla-europe.org/fr/](http://www.mozilla-europe.org/fr/).

Select some text on that page and right-click to activate the context menu.
You should see a new item labeled "Translate Selection". Select that item and
the text you selected should be replaced with its English translation.

You will also see output like this appear in the console:

    info: input: Quoi de neuf chez Mozilla?
    info: output: What's New in Mozilla?

## Packaging It ##

Your program is packaged like any other extension for a Mozilla-based
application, as a XPI file. The Add-on SDK simplifies the packaging
process by generating this file for you.

To package your program as a XPI, navigate to the root of your package
directory in your shell and run `cfx xpi`. You should see a message:

    Exporting extension to translator.xpi.

The `translator.xpi` file can be found in the directory in which you ran
the command.

## Installing the Package ##

Test that the package installs correctly by adding it to your own Firefox
installation.

You can do this by pressing the Ctrl+O key combination (Cmd+O on Mac) from
within Firefox. This will bring up a file selection dialog: navigate to the
`translator.xpi` file, open it and follow the prompts to install the
add-on.

Alternatively:

* Open the Firefox Add-ons Manager from within Firefox, either
from the Add-ons item on the Tools menu, or by typing `about:addons` into the
address bar.

* In the Firefox Add-ons Manager there is a gears icon next to the
search bar. Click the icon and select "Install Add-on From File..." from the
menu that appears. Again, this will bring up a file selection dialog which you
can use to find and open the XPI file.

Once you have installed the add-on you can test it in exactly the same way as
in the "Running It" section above.

## Distributing It ##

To distribute your program, you can upload it to
[addons.mozilla.org](http://addons.mozilla.org).
Eventually, this step may be automated via the SDK, streamlining the
distribution process further.

## CommonJS, Modules, Packages, and the SDK ##

CommonJS is the underlying infrastructure for both the SDK modules and add-ons
themselves.

The [CommonJS group](http://wiki.commonjs.org/wiki/CommonJS) defines
specifications for **modules** and **packages**.

### CommonJS Modules ###

A CommonJS **module** is a piece of reusable JavaScript: it exports certain
objects which are thus made available to dependent code. To facilitate this
CommonJS defines:

* an object called `exports` which contains all the objects which a CommonJS
module wants to make available to other modules

* a function called `require` which a module can use to import the `exports`
object of another module. Your translator add-on uses `require` to import the
SDK modules it uses.

![CommonJS modules](media/commonjs-modules.jpg)

### CommonJS Packages ###

A CommonJS **package** is a structure which can wrap a collection of related
modules: this makes it easier to distribute, install and manage modules.

Minimally, a package must include a package descriptor file named
`package.json`: this file contains information about the package such as a short
description, the authors, and the other packages it depends on.

Packages must also follow a particular directory structure, which is the
structure `cfx init` created for your add-on. *Note: this isn't quite true until
[614712](https://bugzilla.mozilla.org/show_bug.cgi?id=614712) is fixed*.

### CommonJS and the Add-on SDK ###

* The JavaScript modules which the SDK provides are CommonJS modules, and they
are collected into CommonJS packages.

* The JavaScript components of an add-on constitute one or more
CommonJS modules, and a complete add-on is a CommonJS package.

According to the CommonJS specification, if a module called `main` exists in a
CommonJS package, that module will be evaluated as soon as your program is
loaded. For an add-on, that means that the `main` module will be evaluated as
soon as the host application (such as Firefox) has enabled your program as an
extension.

So in terms of CommonJS objects the translator consists of a package that
contains a single module called `main`, and which imports three SDK modules:

![CommonJS translator](media/commonjs-translator.jpg)

Because an add-on is a CommonJS package it's possible to include more than one
module in an add-on, and to make your modules available to any code that want
to use them.

In the next section we'll see how you can use the SDK implement and test your
own [reusable modules](#guide/implementing-reusable-module).
