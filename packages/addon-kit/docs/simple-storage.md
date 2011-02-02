The `simple-storage` module lets you easily and persistently store data across
application restarts.  If you're familiar with [DOM storage][] on the Web, it's
kind of like that, but for add-ons.

[DOM storage]: https://developer.mozilla.org/en/DOM/Storage


Introduction
------------

The simple storage module exports an object called `storage` that is persistent
and private to your add-on.  It's a normal JavaScript object, and you can treat
it as you would any other.

To store a value, just assign it to a property on `storage`:

    var ss = require("simple-storage");
    ss.storage.myArray = [1, 1, 2, 3, 5, 8, 13];
    ss.storage.myBoolean = true;
    ss.storage.myNull = null;
    ss.storage.myNumber = 3.1337;
    ss.storage.myObject = { a: "foo", b: { c: true }, d: null };
    ss.storage.myString = "O frabjous day!";

You can store array, boolean, number, object, null, and string values.  If you'd
like to store other types of values, you'll first have to convert them to
strings or another one of these types.

Be careful to set properties on the `storage` object and not the module itself:

    // This is no good!
    var ss = require("simple-storage");
    ss.foo = "I will not be saved! :(";


Quotas
------

The simple storage available to your add-on is limited.  Currently this limit is
about five megabytes (5,242,880 bytes).  You can choose to be notified when you
go over quota, and you should respond by reducing the amount of data in storage.
If the user quits the application while you are over quota, all data stored
since the last time you were under quota will not be persisted.  You should not
let that happen.

To listen for quota notifications, register a listener for the `"OverQuota"`
event.  It will be called when your storage goes over quota.

    function myOnOverQuotaListener() {
      console.log("Uh oh.");
    }
    ss.on("OverQuota", myOnOverQuotaListener);

Listeners can also be removed:

    ss.removeListener("OverQuota", myOnOverQuotaListener);

To find out how much of your quota you're using, check the module's `quotaUsage`
property.  It indicates the percentage of quota your storage occupies.  If
you're within your quota, it's a number from 0 to 1, inclusive, and if you're
over, it's a number greater than 1.

Therefore, when you're notified that you're over quota, respond by removing
storage until your `quotaUsage` is less than or equal to 1.  Which particular
data you remove is up to you.  For example:

    ss.storage.myList = [ /* some long array */ ];
    ss.on("OverQuota", function () {
      while (ss.quotaUsage > 1)
        ss.storage.myList.pop();
    });


Private Browsing
----------------

*This section applies only to add-ons running on Firefox.*

If your storage is related to your users' Web history, personal information, or
other sensitive data, your add-on should respect [private browsing mode][SUMO].
While private browsing mode is active, you should not store any sensitive data.

Because any kind of data can be placed into simple storage, support for private
browsing is not built into the module.  Instead, use the
[`private-browsing`](#module/addon-kit/private-browsing) module to check private
browsing status and respond accordingly.

For example, the URLs your users visit should not be stored during private
browsing.  If your add-on records the URL of the selected tab, here's how you
might handle that:

    ss.storage.history = [];
    var privateBrowsing = require("private-browsing");
    if (!privateBrowsing.active) {
      var url = getSelectedTabURL();
      ss.storage.history.push(url);
    }

For more information on supporting private browsing, see its [Mozilla Developer
Network documentation][MDN].  While that page does not apply specifically to
SDK-based add-ons (and its code samples don't apply at all), you should follow
its guidance on best practices and policies.

[SUMO]: http://support.mozilla.com/en-US/kb/Private+Browsing
[MDN]: https://developer.mozilla.org/En/Supporting_private_browsing_mode


<api name="storage">
@property {object}
  A persistent object private to your add-on.  Properties with array, boolean,
  number, object, null, and string values will be persisted.
</api>

<api name="quotaUsage">
@property {number}
  A number in the range [0, Infinity) that indicates the percentage of quota
  occupied by storage.  A value in the range [0, 1] indicates that the storage
  is within quota.  A value greater than 1 indicates that the storage exceeds
  quota.
</api>

