The <tt>timer</tt> module provides access to web-like timing functionality.

<tt>timer.**setTimeout**(*callback*, *ms*)</tt>

Schedules *callback* to be called in *ms* milliseconds. Returns an
integer ID that can later be used to undo this scheduling, if
*callback* hasn't yet been called.

<tt>timer.**clearTimeout**(*id*)</tt>

Given an integer ID passed back from <tt>setTimeout()</tt>, prevents
the callback with the ID from being called (if it hasn't yet been
called).
