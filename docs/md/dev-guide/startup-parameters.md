# Configuring App Parameters

There are a number of parameters available that customize application
behavior.  These include things like your app's icon and name.  These
parameters are controlled by placing a JSON configuration file in the
directory where your application code resides.  The file should be
named `appinfo.json`.

## By Example:

    {
        "build_id": "20110214184307", 
        "vendor": "Unknown", 
        "name": "My First Browser", 
        "resizable": true, 
        "menubars": true, 
        "developer_email": "unknown@unknown.com", 
        "version": "0.1"
    }

## Supported Fields

**name** - *{string}* The application name.  This will be used to name your application directory
on disk during generation, will be used as the name of the binary, and will show
up in the process monitor when your application is running.

**vendor** - *{string}* The name of the organization or person who develops this application.
This will be stamped into your application in various places (such as `info.plist`,
xulrunner `application.ini`, `.exe` manifest, etc).

**version** - *{string matching /^[0-9]+\.[0-9+]$/}* The version of the application.  This will be stamped into various resources of your application.

**build_id** - *{integer}* An integer timestamp that will be generated for you as
the seconds since Jan 1st, 1970.

**developer_email** - *{string}* Will be stamped into various resources of your application.

**menubars** - *{boolean}* Whether menubars should be displayed at the top of the application window (ignored on osx where application menus are always displayed in the top bar).

**resizable** - *{boolean}* Whether the main application menu should be resizable.

