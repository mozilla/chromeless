The <tt>observer-service</tt> module provides access to the
application-wide observer service singleton.

For a list of common observer topics across a variety of Mozilla-based
applications, see the MDC page on [Observer Notifications].

## Observer Callbacks ##

Observer callbacks are functions of the following form:

    function callback(subject, data) {
      /* Respond to the event notification here... */
    }

In the above example, <tt>subject</tt> is any JavaScript object, as is
<tt>data</tt>.  The particulars of what the two contain are specific
to the notification topic.

## Functions ##

<tt>observer-service.**add**(*topic*, *callback*)</tt>

Adds an observer callback to be triggered whenever a notification
matching the string *topic* is broadcast throughout the application.

<tt>observer-service.**remove**(*topic*, *callback*)</tt>

Unsubscribes *callback* from being triggered whenever a notification
matching the string *topic* is broadcast throughout the application.

<tt>observer-service.**notify**(*topic*, *subject*, *data*)</tt>

Broadcasts a notification event with the string *topic*, passing
*subject* and *data* to all applicable observers in the
application.

  [Observer Notifications]: https://developer.mozilla.org/en/Observer_Notifications
