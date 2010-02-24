The <tt>unload</tt> module allows modules to register callbacks that
are called when Jetpack code is unloaded.  It is similar to the
CommonJS module of the same name in the [Narwhal] platform.

<tt>unload.**when**(*callback*)</tt>

Registers *callback* to be called when <tt>unload.send()</tt> is
called.

<tt>unload.**send**()</tt>

Sends an unload signal, thereby triggering all callbacks registered
via <tt>unload.when()</tt>. In general, this function need not be
manually called; it is automatically triggered by the embedder.

  [Narwhal]: http://narwhaljs.org/
