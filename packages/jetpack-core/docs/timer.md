The `timer` module provides access to web-like timing functionality.

<code>timer.**setInterval**(*callback*, *ms*)</code>

Schedules *callback* to be called repeatedly every *ms* milliseconds.
Returns an integer ID that should later be used to unschedule the
callback.

<code>timer.**clearInterval**(*id*)</code>

Given an integer ID returned from `setInterval()`,
prevents the callback with the ID from being called again.

<code>timer.**setTimeout**(*callback*, *ms*)</code>

Schedules *callback* to be called in *ms* milliseconds. Returns an
integer ID that can later be used to undo this scheduling, if
*callback* hasn't yet been called.

<code>timer.**clearTimeout**(*id*)</code>

Given an integer ID returned from `setTimeout()`, prevents
the callback with the ID from being called (if it hasn't yet been
called).
