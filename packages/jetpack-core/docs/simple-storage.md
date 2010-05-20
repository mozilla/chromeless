The `simple-storage` module lets you easily and persistently store data across
application restarts.  If you're familiar with [DOM storage][] on the Web, it's
kind of like that, but for extensions.

[DOM storage]: https://developer.mozilla.org/en/DOM/Storage


Introduction
------------

The simple storage module exports an object called `storage` that is persistent
and private to your extension.  It's a normal JavaScript object, and you can
treat it as you would any other.

To store a value, just assign it to a property on `storage`:

    var simpleStorage = require("simple-storage");
    simpleStorage.storage.array = [1, 1, 2, 3, 5, 8, 13];
    simpleStorage.storage.boolean = true;
    simpleStorage.storage.null = null;
    simpleStorage.storage.number = 3.1337;
    simpleStorage.storage.object = { a: "foo", b: { c: true }, d: null };
    simpleStorage.storage.string = "O frabjous day!";

You can store array, boolean, number, object, null, and string values.  If you'd
like to store other types of values, you'll first have to convert them to
strings or another one of these types.

You can also set the `storage` property itself.  The types above are also legal
here.

    simpleStorage.storage = [1, 1, 2, 3, 5, 8, 13];
    simpleStorage.storage = true;
    simpleStorage.storage = null;
    simpleStorage.storage = 3.1337;
    simpleStorage.storage = { a: "foo", b: { c: true }, d: null };
    simpleStorage.storage = "O frabjous day!";

Be careful with this approach, though: You must set the `storage` property on
the module, not a reference to the `storage` object, so the following pattern
will not work:

    // This is no good!
    var myStorage = simpleStorage.storage;
    myStorage = "I will not be saved! :(";


Quotas
------

The simple storage available to your extension is limited.  Currently this limit
is about five megabytes (5,242,880 bytes).  You can choose to be notified when
you go over quota, and you should respond by reducing the amount of data in
storage.  If the user quits the application while you are over quota, all data
stored since the last time you were under quota will not be persisted.  You
should not let that happen.

To listen for quota notifications, register a listener with the module's
`onOverQuota` collection.  A single listener may be registered by assigning a
function:

    simpleStorage.onOverQuota = function () { /* ... */ };

Multiple listeners may be registered by assigning an array of functions:

    simpleStorage.onOverQuota = [ function () {}, function () {} ];

You can add listeners:

    simpleStorage.onOverQuota.add(function () {});
    simpleStorage.onOverQuota.add([ function () {}, function () {} ]);

And remove them:

    function myListener() {}
    simpleStorage.onOverQuota.remove(myListener);
    simpleStorage.onOverQuota.remove([ myListener, anotherListener ]);

To find out how much of your quota you're using, check the module's `quotaUsage`
property.  It indicates the percentage of quota your storage occupies.  If
you're within your quota, it's a number from 0 to 1, inclusive, and if you're
over, it's a number greater than 1.

Therefore, when you're notified that you're over quota, respond by removing
storage until your `quotaUsage` is less than or equal to 1.  Which particular
data you remove is up to you.  For example:

    simpleStorage.storage = [ /* some long array */ ];
    simpleStorage.onOverQuota = function () {
      while (simpleStorage.quotaUsage > 1)
        simpleStorage.storage.pop();
    };


Private Browsing
----------------

*This section applies only to extensions running on Firefox.*

If your storage is related to your users' Web history, personal information, or
other sensitive data, your extension should respect [private browsing
mode][SUMO].  While private browsing mode is active, you should not store any
sensitive data.

Because any kind of data can be placed into simple storage, support for private
browsing is not built into the module.  Instead, use the `private-browsing`
module in the `jetpack-core` package to check private browsing status and
respond accordingly.

For example, the URLs your users visit should not be stored during private
browsing.  If your extension records the URL of the selected tab, here's how you
might handle that:

    simpleStorage.storage.history = [];
    var privateBrowsing = require("private-browsing");
    if (!privateBrowsing.active) {
      var url = getSelectedTabURL();
      simpleStorage.storage.history.push(url);
    }

For more information on supporting private browsing, see its [Mozilla Developer
Network documentation][MDN].  While that page does not apply specifically to
Jetpack-based extensions (and its code samples don't apply at all), you should
follow its guidance on best practices and policies.

[SUMO]: http://support.mozilla.com/en-US/kb/Private+Browsing
[MDN]: https://developer.mozilla.org/En/Supporting_private_browsing_mode


Reference
---------

<code>simpleStorage.**storage**</code>

A persistent object private to the extension.  Properties with array, boolean,
number, object, null, and string values will be persisted.  The `storage`
property itself may also be set to a value of one of these types.

<code>simpleStorage.**onOverQuota**</code>

A collection of listeners that will be notified when the storage goes over
quota.  Each is a function.

<code>simpleStorage.**quotaUsage**</code>

A number in the range [0, Infinity) that indicates the percentage of quota
occupied by storage.  A value in the range [0, 1] indicates that the storage is
within quota.  A value greater than 1 indicates that the storage exceeds quota.
