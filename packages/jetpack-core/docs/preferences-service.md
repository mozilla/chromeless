The `preferences-service` module provides access to the
application-wide preferences service singleton.

<code>preferences-service.**set**(*name*, *value*)</code>

Sets the application preference *name* to *value*.  *value* must
be a string, boolean, or number.

<code>preferences-service.**get**(*name*, *defaultValue*)</code>

Gets the application preference *name*, returning *defaultValue*
if no such preference exists.

<code>preferences-service.**has**(*name*)</code>

Returns whether or not the application preference *name* exists.

<code>preferences-service.**isSet**(*name*)</code>

Returns whether or not the application preference *name* both exists
and has been set to a non-default value by the user (or a program
acting on the user's behalf).

<code>preferences-service.**reset**(*name*)</code>

Clears a non-default, user-set value from the application preference
*name*. If no user-set value is defined on *name*, the function
does nothing.
