The `unload` module allows modules to register callbacks that
are called when Jetpack code is unloaded.  It is similar to the
CommonJS module of the same name in the [Narwhal] platform.

<code>unload.**when**(*callback*)</code>

Registers *callback* to be called when `unload.send()` is
called.

<code>unload.**send**()</code>

Sends an unload signal, thereby triggering all callbacks registered
via `unload.when()`. In general, this function need not be
manually called; it is automatically triggered by the embedder.

  [Narwhal]: http://narwhaljs.org/
