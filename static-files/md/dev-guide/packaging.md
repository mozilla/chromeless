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
      "description": "This is my first package."
    }

Now reload this page. You should see `my-first-package` listed under
*Package Reference* on the left side of this page, with its
description next to it. The Jetpack SDK's documentation server has
automatically detected your new package and has started documenting
it!

