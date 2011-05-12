# Using Libraries With `require()` 

Chromeless injects a special function that's accessible from javascript
which grants you access to a growing set of libraries that let you 
interact with web content and the desktop.

Let's see a small example of how you might programmatically set your application
to run fullscreen.  Here is a complete application that does this:

    <html>
      <head><title>Fullscreen Apps Are Easy</title></head>
      <body><h1>IM ALL UP IN YOUR FULLSCREEN, MANG!</h1></body>
      <script>
        window.addEventListener("load", function() {
          var fullscreen = require('fullscreen');
          fullscreen.enable();
        }, true);
      </script>
    </html>

To run this application, simply create a directory, and add the contents of the code
above to an `index.html` file within.  Once complete, run it under chromeless:

    $ ../<path>/<to>/chromeless .

You'll see your app, rather harshly, consume all of your available desktop.

## How It Works

The modules provided with chromeless have some number of *exported* functions and 
variables.  The require function will load one of these modules, and return an
object which has properties corresponding to all of the exported properties by 
the module in question.

If you're at all familiar with [node.js](http://nodejs.org), or have heard of the
[CommonJS Module specification](http://wiki.commonjs.org/wiki/Modules), then 
this manner of including code may be familiar to you.  If not, you already know
enough to use it!

From here, you can [explore the libraries available in chromeless](#package/lib),
and start using the features they provide in your apps!
