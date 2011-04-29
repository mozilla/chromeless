## Welcome To Chromeless!

The 'chromeless' project is an experiment into making it possible to build
a web browser using only web technologies, like HTML, JavaScript, and CSS.

The project is based on [addon-sdk (aka,
"jetpack")](http://github.com/mozilla/addon-sdk), and
[xulrunner](https://developer.mozilla.org/en/xulrunner).

## Current State

This project is *highly* experimental, rapidly changing, and probably
insecure.  As the project matures, this notice will change.

## Design Overview

Chromeless can be used to created desktop applications using HTML, 
and related web technologies. In version 0.1, the original goal was a focus 
towards authoring a browser-like applications in HTML. That is still valid, however, 
now you can also use Chromeless to create all sorts of apps that can be executed like 
 a native application, but where all of the look and feel, and many of the
behaviors are defined by HTML, CSS, and javascript provided by the developer.

This "main app HTML" is basically a normal webpage, but with several important differences:

  * The HTML file has access to a 'window.require()' function that it can use to
    access new APIs that give it increased priviledges.

  * (untrusted) Web content can be rendered inside iframes which are children of the
    top level "main app HTML".  This content cannot tell its rendered inside an iframe,
    and has no special access to the main app context.

  * Several new events and conventions are introduced.  For instance, the title of the
    top level browser HTML is the name of the running process (not yet implemented),
    new, non-standard events are available to the top level browser HTML which give it
    a priviledged view (and control) over embedded web content.

## Prerequisites

* OSX 10.5 and later, Windows XP and later, or probably a modern versions of linux (32 or 64 bit).
* Python 2.5 - 2.7 (3 is not supported); Python 2.6 or 2.7 are recommended (testing isn't as thorough with 2.5).

## Getting Started

The top level `chromeless` python script is capable of several things:

  * running a browser when provided a path to 'browser HTML'
  * packaging a browser as a xulrunner package, or a standalone exectuable (not yet implemented)
  * running unit tests (not yet implemented)
  * generating static documentation for all current APIs (not yet implemented)

To get started, you should clone this repository (or download a versioned snapshot) and run:

    (win32) C:\xxx\chromeless> chromeless
    (osx)   $ ./chromeless

By default, the HTML files in `examples/first_browser` will be executed, and you'll see a very
simple browser based on them.  You may also specify an alternate browser HTML on the command line:

    (win32) C:\xxx\chromeless> chromeless examples\webgl
    (osx)   $ ./chromeless examples/webgl

From here, you can inspect the implementation of any of these samples, copy, modify and explore.

For deployment or to share your application, you can use chromeless to generate a standalone
application folder, that anyone on a supported platform can run.  Output will be placed
in the build/ directory:

    (win32) C:\xxx\chromeless> chromeless appify examples\webgl
    (osx)   $ ./chromeless appify examples/webgl

Finally, it's possible to generate a "XULRunner application", which is a folder that is much
smaller than a standalone application, but can be run under (a specific version of) xulrunner.
Again, the output will be placed in the build/ directory:

    (win32) C:\xxx\chromeless> chromeless  package examples\webgl
    (osx)   $ ./chromeless package examples/webgl 

## Documentation and Additional Information

To generate a local API documentation, use: 

    (win32) C:\xxx\chromeless> chromeless docs
    (osx)   $ ./chromeless docs

You may also check the [Chromeless documentation online](http://mozilla.github.com/chromeless), plus 
inline examples can also be helpful. You can always find us on irc in `#labs` 
at `irc.mozilla.org`, or get help or discuss this project on our mailing
 list: `mozilla-labs@googlegroups.com`

## Sub-projects for Tests 

A Tests application is provided along wth Chromeless and can execute tests for all the 
apps under tests/ directory that have the test-app.js file in it: 

    (win32) C:\xxx\chromeless> chromeless tests
    (osx)   $ ./chromeless tests

## Gallery 

An early version of a developer's gallery is now part of this git repository using 
git sub-modules. You may use Chromeless to launch or package these examples that 
provided in the gallery/ directory.

## Notes and Known Issues

  * You need to pass a relative path to your application when you invoke chromeless script 
  * This version only packages your files that are under your main application directory. So if you use, for example, jquery in a sub-directory, it will not be bundled. Make sure you have all your files in the same directory. 
  * With Mac OSX, if you launch the application for tests ( not passing package option ), the keyboard output will show in the console and not in the browser screen. For Mac OSX, you may need to use the "package" argument and install in your machine. 
  * It works with some specific versions of XULRunner. And to help out developers, the chromeless script will fetch a XULRunner SDK. 

## LICENSE

All files that are part of this project are covered by the following
license, except where explicitly noted.

    Version: MPL 1.1/GPL 2.0/LGPL 2.1

    The contents of this file are subject to the Mozilla Public License Version
    1.1 (the "License"); you may not use this file except in compliance with
    the License. You may obtain a copy of the License at
    http://www.mozilla.org/MPL/

    Software distributed under the License is distributed on an "AS IS" basis,
    WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
    for the specific language governing rights and limitations under the
    License.

    The Original Code is chromeless.

    The Initial Developer of the Original Code is the Mozilla Foundation.

    Portions created by the Initial Developer are Copyright (C) 2010
    the Initial Developer. All Rights Reserved.

    Contributor(s):

    Alternatively, the contents of this file may be used under the terms of
    either the GNU General Public License Version 2 or later (the "GPL"), or
    the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
    in which case the provisions of the GPL or the LGPL are applicable instead
    of those above. If you wish to allow use of your version of this file only
    under the terms of either the GPL or the LGPL, and not to allow others to
    use your version of this file under the terms of the MPL, indicate your
    decision by deleting the provisions above and replace them with the notice
    and other provisions required by the GPL or the LGPL. If you do not delete
    the provisions above, a recipient may use your version of this file under
    the terms of any one of the MPL, the GPL or the LGPL.
