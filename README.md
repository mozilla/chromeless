# What?

*WARNING*: if you don't like caveats, leave now!

*WARNING*: This repo is highly experimental!  While the explanation that follows may suggest
that this repository is actually meaningful, it is not.

*WARNING*: This thing is osx/linux ONLY for now

This repository is a remix of the [jetpack-sdk](http://github.com/mozillalabs/jetpack-sdk).  The
ultimate goal is to build your own browser using (mostly) standard web technologies.

## Getting Started

1. ./run

or pass an argument for the files located inside the `./ui` directory

2. ./run first_browser/index.html or ./run test_require/index.html

## What could go wrong?

In order to work, you probably should make sure you've got ffx 3.6.x
on your system, or [XulRunner](https://developer.mozilla.org/en/XULRunner) installed. 

**DETAILS**: At present, the `run` script will look for xulrunner on your system
(or some other mozilla product that provides xulrunner).  If no such
product exists, everything will come to a grinding halt.  At a future
date, this repository may grow the ability to acquire and build the
bits that it needs.  There are problems with ffx 4 > b4 at present, so 
if you're bleeding edge you'll need to downgrade.

## Hacking

Have a look at the ui/ directory.  This is web-like content that
comprises the main view of the application. It will be rendered in an
unadorned windows. Feel free to hack on it.

## Deeper Hacking

The content in UI is rendered by a "jetpack module" that lives in
`packages/chromeless/lib/main.js`.  A trimmed down version of jetpack has been
included inside this repository, and the theory is that we'll remove
packages that aren't relevant to standalone application development,
and add some new ones that are. If you are familiar with jetpack then
you should be comfortable diving in and hacking on modules.

NOTE: if you want to kick off the jetpack documentation server to
inspect the modules included here, run `impl/bin/cfx docs` and follow
instructions.

## cred

this repo is a remix of work by atul, myk, marcio, and the jetpack
community.


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
