The `unload` module allows modules to register callbacks that
are called when Jetpack code is unloaded.  It is similar to the
CommonJS module of the same name in the [Narwhal] platform.

<code>unload.**ensure**(*object*)</code>

Calling `ensure()` on an object does two things:

1. It replaces *object.unload()* with a wrapper method that will
   never call *object.unload()* more than once.
2. It ensures that this wrapper method is called when
   `unload.send()` is called.

Therefore, when you register an object with `ensure()`, you can
call its `unload()` method yourself, you can let it happen for you,
or you can do both.

*object.unload()* will be called with a single argument describing
the reason for the unload; see `unload.when()`.  If *object* does
not have an `unload()` method, then an exception is thrown when
`ensure()` is called.

<code>unload.**when**(*callback*)</code>

Registers *callback* to be called when `unload.send()` is
called.  *callback* is called with a single argument, one of the
following strings describing the reason for unload: `"uninstall"`,
`"disable"`, `"shutdown"`, `"upgrade"`, or `"downgrade"`.  (On Gecko
1.9.2-based applications, such as Firefox 3.6, `"upgrade"` and
`"downgrade"` are not available, and `"shutdown"` will be sent in
their place.)  If a reason could not be determined, `undefined` will
be passed instead.

Note that if an add-on is unloaded with reason `"disable"`, it will
not be notified about `"uninstall"` while it is disabled.  A solution
to this issue is being investigated; see bug 571049.

<code>unload.**send**(*reason*)</code>

Sends an unload signal, thereby triggering all callbacks registered
via `unload.when()`. In general, this function need not be
manually called; it is automatically triggered by the embedder.
*reason* is a string describing the reason for unload; see
`unload.when()`.

  [Narwhal]: http://narwhaljs.org/
