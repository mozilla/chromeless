The Jetpack SDK houses collections of reusable code, documentation,
and other associated resources in structures called *packages*.

A list of packages in the Jetpack SDK environment that generated this
documentation is on the left side of this page under the heading
*Package Reference*.

Packages are just directories on your filesystem. Specifically,
they're located under the `packages` directory in the root of your
Jetpack SDK environment.

Your First Package
------------------

We'll walk through the creation of a simple package to give you
an idea of how they work.

Before we begin, if the page you're reading right now isn't hosted at
`127.0.0.1` or `localhost`, you should run `cfx docs`
immediately. This will run a self-hosted documentation server and open
it in your web browser. The server will dynamically generate the
documentation of all your packages for you, which makes development
much easier.

### A Tiny Manifest ###

The simplest possible package is just a directory that contains a
JSON file called `package.json`. Go ahead and create a directory
called `my-first-package` under your SDK's `packages` directory,
and populate it with a file called `package.json` that contains
the following:

    {
      "description": "This is my first package, it's tiny.",
      "author": "Me (http://me.org)"
    }

Now reload this page. You should see `my-first-package` listed under
*Package Reference* on the left side of this page, with its
description next to it. The Jetpack SDK's documentation server has
automatically detected your new package and has started documenting
it!

### A Tiny Module ###

Reusable pieces of code are called *modules*. The Jetpack SDK uses a
module standard called CommonJS, which means that it's possible to
share code between Jetpack and other JavaScript-based frameworks like
node.js.

From the root of your new package's directory, create a new directory
called `lib`.  In it, create a file called `my-module.js` with the
following contents:

    exports.add = function add(a, b) {
      return a + b;
    };

In the code above, `exports` is a global object--part of the CommonJS
module standard--provided to all modules by the Jetpack framework. To
make data or code visible to other modules for reuse, a module simply
"attaches" it to the `exports` object.

### A Tiny Test Suite ###

To try importing our module, we'll use it in a test suite.

Just as a package's reusable code goes in the `lib` directory, so too
do its tests go into a directory called `tests`. Create it, create
a file in it called `test-my-module.js`, and put the following in it:

    var myModule = require("my-module");

    exports.ensureAdditionWorks = function(test) {
      test.assertEqual(myModule.add(1, 1), 2, "1 + 1 = 2");
    };

In the code above, `require` is another global object that is
part of the CommonJS module standard. It essentially finds a module
with the given name and returns its `exports` object.

As you can probably guess, the above code also happens to be a
CommonJS module. Its single export is a *test function*, named
according to the type of behavior it's testing, and it takes a single
parameter, `test`, which should ultimately be passed to it by the test
framework that executes it. This `test` object is called a *test runner*,
and has an API that makes it really easy to run tests.

#### Running The Tests ####

<span class="aside">
Writing and running tests has been designed to be as easy and fast as
possible in the Jetpack SDK.
</span>

Now go to the root directory of your new package and run `cfx test
--verbose`. This command automatically looks in the `tests` directory
if one exists, loads any modules that start with the word `test`, and
calls all their exported functions, passing them a test runner
implementation as their only argument.

The output should look something like this:

    info: executing 'test-my-module.ensureAdditionWorks'
    info: pass: 1 + 1 = 2

    Malloc bytes allocated (in use by application): 6450720
    Malloc bytes mapped (not necessarily committed): 14262272
    Malloc bytes committed (r/w) in default zone: 6460272
    Malloc bytes allocated (in use) in default zone: 13213696
    Tracked memory objects in testing sandbox: 2

    1 of 1 tests passed.
    OK
    Total time: 1.612978 seconds
    Program terminated successfully.

Obviously, you don't have to pass the `--verbose` option to `cfx`
if you don't want to; doing so just makes the output easier
to read.

### Some Meager Documentation ###

<span class="aside">
If you ever want to know how to achieve the same kind of effect
that's used in another page of documentation you've seen, try
clicking the *view source* link at the bottom-right corner of every
page.
</span>

If you click on your package's name on the left-hand side of this page,
you'll notice that it says "This package has no documentation."  To
make some, all you need to do is create a file called `README.md` in
the root of your package's directory. For starters, fill it with this:

    This is my *first* package. It contains:

    * A tiny module.
    * A tiny test suite.
    * Some meager documentation.

Save that file and reload the detail page for your package. The
documentation should be there now, with nice formatting to boot.

This formatting syntax is called Markdown, and is a simple, lightweight
way to write documentation whose source is human-readable, while
"gracefully upgrading" when presented in richer media like HTML.

You can also document individual modules in your package by creating
a directory called `docs` in the root of your package directory and
populating it with Markdown files that have the same name as your
modules, replacing the `.js` extension with `.md`. For instance,
you could add documentation for `my-module` at `docs/my-module.md`.
This will automatically be displayed when you click your module
on the left-hand side of this page.
