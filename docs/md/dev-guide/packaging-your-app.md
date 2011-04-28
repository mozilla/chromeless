# Packaging Your App

After using the `chromeless` harness to develop your application, you
can generate a standalone package which combines your app with the
chromeless runtime.  The `appify` command provides this functionality.
Usage is simple:

    $ ./chromeless appify examples/thumbnails
    Generating a standalone, redistributable, application
    Using Browser HTML at '/home/lth/dev/chromeless/examples/thumbnails/index.html'
    Building application in >/home/lth/dev/chromeless/build/My Chromeless App< ...
      ... removing previous application
      ... copying in xulrunner binaries
      ... placing xulrunner binary
    Building xulrunner app in >/home/lth/dev/chromeless/build/My Chromeless App< ...
      ... copying application template
      ... creating application.ini
      ... copying in CommonJS packages
      ... copying in browser code (/home/lth/dev/chromeless/examples/thumbnails)
      ... writing application info file
      ... writing harness options
    xul app generated in build/My Chromeless App

Depending on your platform, the application will be output in a
slightly different format.  On OSX a `.app` folder will be generated,
while on linux and windows a folder containing all dependencies will
be output.

You can combine this output with your installer technology of choice
to create a distributable installer file.
