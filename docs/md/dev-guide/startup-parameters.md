## Configuring App Parameters

There are a number of basic parameters that can be changed to customize
your applications basic behavior.  These include your app's icon,
name, initial window size and characteristics, and more.  These parameters
are controlled by placing a JSON configuration file in the directory where 
your application code resides.  The file should be named `appinfo.json`.

## Example

    {
        "build_id": "20110214184307", 
        "initial_dimensions": {
            "width": 800, 
            "height": 600
        }, 
        "vendor": "Unknown", 
        "name": "My First Browser", 
        "resizable": "false", 
        "developer_email": "unknown@unknown.com", 
        "version": "0.1"
    }

## Supported Fields

**name** - The application name.  This will be used to name your application directory
on disk during generation, will be used as the name of the binary, and will show
up in the process monitor when your application is running.

**vendor** - The name of the organization or person who develops this application.
This will be stamped into your application in various places (such as `info.plist`,
xulrunner `application.ini`, `.exe` manifest, etc).

**version** - The version of the application.  This will be stamped into various 
resources of your application.

**build_id** - An integer timestamp that will be generated for you as
the seconds since Jan 1st, 1970.

**developer_email** - Will be stamped into various resources of your application.


