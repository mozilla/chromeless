With the Jetpack SDK you can use modules in a regular XUL-based extension. This
can be helpful if you want to use some of Jetpack APIs, if you like the way
Jetpack modules help separate your code into testable and re-usable pieces,
or if you'd like to gradually migrate an existing extension over to Jetpack.

Running a jetpack in Firefox
------------------
We assume you have already completed the [Getting Started](#guide/getting-started),
[Packaging](#guide/packaging), and [Programs](#guide/programs) steps of the
main tutorial. You should have a package called "my-first-package" (including a
`package.json` manifest) and modules named "my-module" and "main".
You have used `cfx run` to run the program, which creates a
[keypair](#guide/xpi) for you.

Let's now use `cfx` to run Firefox with your extension.

First, modify `main.js` - comment out the `callbacks.quit()` call so that we
can see the Firefox main window when using `cfx run`:

    exports.main = function(options, callbacks) {
      console.log("Hello World!");
      // Don't need to quit right away: no callbacks.quit();
    }

Now go to the package directory and run `cfx run` to load
the module in Firefox.

This will start Firefox with a clean profile and our package installed.

Getting your XUL extension to run with Jetpack SDK
------------------
<span class="aside">
There's only one interesting file in the template extension - the `harness.js`
component that provides the CommonJS module loader (the `require()`
implementation) and bootstraps the jetpack (i.e. starts its `main` program or
runs tests).
</span>
Copy the extension template the SDK uses to run jetpacks from
`jetpack-sdk/python-lib/cuddlefish/app-extension` to your own folder, for
example `jetpack-sdk/packages/my-first-package/extension`.

Copy your other extension files to `jetpack-sdk/packages/my-extension/extension`
(`components`, `chrome.manifest` and chrome files, etc).

Now you can run Firefox with your XUL extension *and* our test module installed
by executing the following command from the package folder,
`jetpack-sdk/packages/my-extension`:

    cfx run -t extension

(The `-t` parameter is actually the path to the folder with the "template"
extension to install when running the specified application).

Loading modules from extension's code
------------------
To load modules we'll need to get the harness XPCOM service provided by
Jetpack. This service has contract ID 
`@mozilla.org/harness-service;1?id=<package id>`, where *&lt;package-id>*
is the programs "JID", found in `package.json` as the `id` key.

<span class="aside">
The specified ID will also be used as `em:id` in `install.rdf` when building
an XPI with `cfx xpi`, but with a `@jetpack` suffix to fulfill the rules of
add-on identifiers.
</span>

The first time you invoke `cfx xpi` or `cfx run`, the `cfx` tool will modify
your `package.json` (if necessary) provide you with an `id` value. The result
will look something like this:

    {
      "id": "jid0-i6WjYzrJ0UFR0pPPM7Znl3BvYbk",
      // other properties here
    }

Now we can use CommonJS modules from regular extension code using this code:

    function loadJetpackModule(module) {
      return Components.classes[
        "@mozilla.org/harness-service;1?id="jid0-i6WjYzrJ0UFR0pPPM7Znl3BvYbk"].
        getService().wrappedJSObject.loader.require(module);
    }
    alert(loadJetpackModule("my-module").add(1, 3)); // alerts 4!

You can test this code by pasting it into the Error Console of the Firefox
instance that appears when you use `cfx run -t extension`.

Packaging the extension into an XPI
------------------
<span class="aside">
Check out [XPI Generation](#guide/xpi) for an overview of how this works.
</span>
As with regular jetpacks, you can use `cfx` to create an XPI from your package:

    cfx xpi -t extension

**Note 1**: `cfx` attempts to update the `install.rdf` with the package metadata, so if
you get RDF-related errors when using that, try using `install.rdf` from the
default template (bug 556072).

**Note 2**: the tests for modules are not included in the created XPI.
