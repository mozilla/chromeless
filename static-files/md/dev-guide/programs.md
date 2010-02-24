If Jetpack packages are constructed in a certain way, they can function as
Firefox or Thunderbird extensions, full-fledged native platform applications,
and more.

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

To try running your application, just navigate to the root of your
package directory in your shell and run `cfx run`.  You should
get something like the following:

    info: Hello World!
    OK
    Total time: 0.510817 seconds
    Program terminated successfully.
