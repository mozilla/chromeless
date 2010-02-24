The <tt>preferences-service</tt> module provides access to the
application-wide preferences service singleton.

<tt>preferences-service.**set**(*name*, *value*)</tt>

Sets the application preference *name* to *value*.  *value* must
be a string, boolean, or number.

<tt>preferences-service.**get**(*name*, *defaultValue*)</tt>

Gets the application preference *name*, returning *defaultValue*
if no such preference exists.

<tt>preferences-service.**has**(*name*)</tt>

Returns whether or not the application preference *name* exists.

<tt>preferences-service.**isSet**(*name*)</tt>

Returns whether or not the application preference *name* both exists
and has been set to a non-default value by the user (or a program
acting on the user's behalf).

<tt>preferences-service.**reset**(*name*)</tt>

Clears a non-default, user-set value from the application preference
*name*. If no user-set value is defined on *name*, the function
does nothing.
