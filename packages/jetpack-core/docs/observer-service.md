The `observer-service` module provides access to the
application-wide observer service singleton.

For a list of common observer topics across a variety of Mozilla-based
applications, see the MDC page on [Observer Notifications].

## Observer Callbacks ##

Observer callbacks are functions of the following form:

    function callback(subject, data) {
      /* Respond to the event notification here... */
    }

In the above example, `subject` is any JavaScript object, as is
`data`.  The particulars of what the two contain are specific
to the notification topic.

## Functions ##

<code>observer-service.**add**(*topic*, *callback*)</code>

Adds an observer callback to be triggered whenever a notification
matching the string *topic* is broadcast throughout the application.

<code>observer-service.**remove**(*topic*, *callback*)</code>

Unsubscribes *callback* from being triggered whenever a notification
matching the string *topic* is broadcast throughout the application.

<code>observer-service.**notify**(*topic*, *subject*, *data*)</code>

Broadcasts a notification event with the string *topic*, passing
*subject* and *data* to all applicable observers in the
application.

  [Observer Notifications]: https://developer.mozilla.org/en/Observer_Notifications
