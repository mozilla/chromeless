<span class="aside">
The procedures described in this section are tentative and likely to
change in the near future.
</span>

If Jetpack packages are constructed in a certain way, they can function as
Firefox or Thunderbird extensions, full-fledged native platform applications,
and more.

## Your First Program ##

Let's create a new package. In its `package.json`, add the following:

    {
      "description": "My first program",
      "main": "my-first-program"
    }

Now, create a file at `lib/my-first-program.js` with the following content:

    exports.main = function(options, callbacks) {
      console.log("Hello World!");
      callbacks.quit("OK");
    }

As you can probably guess, the `main` key in your `package.json`
points to a module in the package's `lib` directory that exports a
function called `main`; this function will be called as soon as your
program is activated. By `activated`, we mean that either a containing
application such as Firefox or Thunderbird has enabled your program as
an extension, or that your program is itself a standalone application.

### Quitting ###

Your `main` function is passed two arguments, one of which contains
callbacks that can be used to communicate with the embedding application.
One of these is `quit`, which can be used at any point to inform the
embedding application that your program is finished, and can immediately
be unloaded.

Some programs--usually ones intended to be extensions--are never
actually "finished" and just permanently augment their embedding
applications until the end-user disables them or the application shuts
down. In these kinds of programs, you never need to call `quit`
yourself.

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

To try running your application, just navigate to the root of your
package directory in your shell and run `cfx run`.  You should
get something like the following:

    info: Hello World!
    OK
    Total time: 0.510817 seconds
    Program terminated successfully.

## To Be Continued... ##

Right now, the Jetpack SDK is at an early stage of
development. There's not too much to show. But be on the lookout for
version 0.2 of the SDK, which will continue this tutorial and show you
how to build a useful Jetpack-based Firefox or Thunderbird extension
that you can distribute to your friends, foes, and family!
