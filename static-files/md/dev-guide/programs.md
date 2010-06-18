<span class="aside">
The procedures described in this section are tentative and likely to
change in the near future.
</span>

If Jetpack packages are constructed in a certain way, they can function as
Firefox or Thunderbird extensions, full-fledged native platform applications,
and more.

## Your First Program ##

We're going to continue building upon our package from the [Packaging]
section. This program will add a context-menu option to links, with the
ability to search Google for the link text.

### Using Jetpack's Built-in Libraries ###

Add a `dependencies` entry to your package.json file, showing that your
package requires modules from the jetpack-core library. It should look
something like this now:

    {
      "description": "This package adds a Google search context-menu item.",
      "author": "Me (http://me.org)",
      "dependencies": ["jetpack-core"]
    }


### Adding Your Code ###

If a module called `main` exists in your package, that module will be evaluated
as soon as your program is loaded. By "loaded", we mean that either a host
application such as Firefox or Thunderbird has enabled your program as an
extension, or that your program is itself a standalone application.  The
forthcoming example will demonstrate an extension.

With this in mind, let's create a file at `lib/main.js` with the
following content:

    var contextMenu = require("context-menu");

    // Create a new context menu item.
    var menuItem = contextMenu.Item({

      label: "Search with Google",

      // A CSS selector. Matching on this selector triggers the
      // display of our context menu.
      context: "a[href]",

      // When the context menu item is clicked, perform a Google
      // search for the link text.
      onClick: function (contextObj, item) {
        var anchor = contextObj.node;
        console.log("searching for " + anchor.textContent);
        var searchUrl = "http://www.google.com/search?q=" +
                        anchor.textContent;
        contextObj.window.location.href = searchUrl;
      }
    });

    // Add the new menu item to the application's context menu.
    contextMenu.add(menuItem);

### Listening for Load and Unload ###

We take a moment to note that just as your program is loaded when it starts, it
is unloaded when it exits. By "unloaded", we mean that either the host
application has quit or disabled or uninstalled your program as an extension, or
that your program as a standalone application has quit. Your program can listen
for both of these load and unload events.

If your program exports a function called `main`, that function will be called
when your program is loaded.

    exports.main = function (options, callbacks) {};

`options` is an object describing the parameters with which your program was
loaded.  In particular, `options.loadReason` is one of the following strings
describing the reason your program was loaded: `"install"`, `"enable"`,
`"startup"`, `"upgrade"`, or `"downgrade"`.  (On Gecko 1.9.2-based applications
such as Firefox 3.6, `"enable"`, `"upgrade"`, and `"downgrade"` are not
available, and `"startup"` will be sent in their place.)

If your program exports a function called `onUnload`, that function will be
called when your program is unloaded.

    exports.onUnload = function (reason) {};

`reason` is one of the following strings describing the reason your program was
unloaded: `"uninstall"`, `"disable"`, `"shutdown"`, `"upgrade"`, or
`"downgrade"`.  (On Gecko 1.9.2-based applications such as Firefox 3.6,
`"upgrade"` and `"downgrade"` are not available, and `"shutdown"` will be sent
in their place.)

Note that if your program is unloaded with reason `"disable"`, it will not be
notified about `"uninstall"` while it is disabled.  (A solution to this issue is
being investigated; see bug 571049.)

### Logging ###

<span class="aside">
If you've used [Firebug], the `console` object may seem familiar.
This is completely intentional; we'll eventually be plugging
this object into a much richer implementation.

  [Firebug]: http://getfirebug.com/
</span>

You'll note that the code above also uses a global object called `console`.
This is a global accessible by any Jetpack module and is very useful
for debugging.

### Running It ###

To run your program, navigate to the root of your package directory
in your shell and run:

    cfx run -a firefox

That will load an instance of Firefox (or your default application)
with your program installed.

### Packaging It ###

Your program is packaged like any other extension for a Mozilla-based
application, as a XPI file. The Jetpack SDK simplifies the packaging
process by generating this file for you.

<span class="aside"> Each Jetpack program (such as an add-on) gets a
separate cryptographic keypair. Your program is signed by the private
key, and the public key is used as the "ID". See
[XPI Generation](#guide/xpi) for more details.</span>

To package your program as a XPI, navigate to the root of your package
directory in your shell and run `cfx xpi`. The first time you do this,
you'll see a message about generating a keypair and modifying your
`package.json` to add an `id` field, asking you to run `cfx xpi` again.
When you re-run it, you should see a message:

    Exporting extension to test.xpi.

The test.xpi file can be found in the directory in which you ran the
command.

### Checking the Package ###

If you'd like to test the packaged program before distributing it,
you can run it from the shell with:

    mozrunner -a test.xpi

Or you can install it from the Firefox Add-ons Manager itself, as
you would when testing a traditional add-on.

Running your program as described in the `Running It` section uses
the same process as packaging it as a .xpi, so this step is optional.

### Distributing It ###

To distribute your program, you can upload it to
[Addons.mozilla.org](http://addons.mozilla.org).
Eventually, this step may be automated via the SDK, streamlining the
distribution process further.

## To Be Continued... ##

Right now, the Jetpack SDK is at an early stage of development.
There's not too much to show. Be on the lookout for upcoming versions
of the SDK, which will expand the built-in set of libraries, continue
this tutorial and show you how to build other types of add-ons, as well
as standalone applications!

  [Packaging]: #guide/packaging
