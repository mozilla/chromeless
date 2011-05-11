# Writing your first Chromeless Application

All that a Chromeless application is, is a collection of web content in a directory.
This tutorial will walk you through the creation of a very simple toy application.
Without further ado, let's get started.

## Step 0: Get Chromeless

First, you'll have to download a copy of the chromeless platform and get it set up,
see the [Getting Started](#guide/getting-started) section for help there.

## Step 1: Write a little html

Create a folder, anywhere you like, and make an `index.html` file inside with the following contents:

    <html>
      <head><title>Desktop Apps Are Easy</title></head>
      <body>
        This is my first chromeless app!
      </body>
    </html>

Once that's saved, you can invoke chromeless from a terminal (or "command prompt")
with a relative path to run your app:

    $ ../<path>/<to>/chromless .

You should see your application spring into existence!

## Step 2: Describe Your Application

Next, let's add a little JSON file that provides some meta data about our application.
Create a file in the same directory called `appinfo.json`:

    {
        "name": "My First Browser", 
        "vendor": "Lloyd Hilaiel",
        "developer_email": "lloyd@mozilla.com"
    }

Now when you re-run your chromeless app, your *application title* will be set correctly.
On all platforms this title will be the name of the running application binary, and 
on OSX the new title will show up in the application bar as the title of the application.

## Step 3: Use The Web!

A chromeless app is first and foremost, a *web* application, so you now have all the
features of the web at your disposal to build your app.  This includes the
[latest features](http://www.mozilla.com/en-US/firefox/features/#cuttingedge)
of the rendering engine used in [Firefox](http://firefox.com).

## Step 4: Use The Desktop!

In addition to access to All Of The Web, Chromeless injects a global
function, `require()`, which gives you access to libraries that give
you access to the desktop.  Jump over to the
[Using `require()`](#guide/tutorial-using-require) section to learn more about
how to integrate your application into the desktop.



