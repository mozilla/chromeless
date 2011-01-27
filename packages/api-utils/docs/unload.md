<!-- contributed by Atul Varma [atul@mozilla.com]  -->
<!-- contributed by Drew Willcoxon [adw@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->

The `unload` module allows modules to register callbacks that are called
when they are unloaded.  It is similar to the CommonJS module of the same
name in the [Narwhal] platform.

[Narwhal]: http://narwhaljs.org/

<api name="ensure">
@function
  Calling `ensure()` on an object does two things:

  1. It replaces `object.unload()` with a wrapper method that will never call
     `object.unload()` more than once.
  2. It ensures that this wrapper method is called when `send()` is
     called.

  Therefore, when you register an object with `ensure()`, you can call its
  `unload()` method yourself, you can let it happen for you, or you can do both.

  `object.unload()` will be called with a single argument describing the reason
  for the unload; see `when()`.  If `object` does not have an `unload()` method,
  then an exception is thrown when `ensure()` is called.

@param object {object}
  An object that defines an `unload()` method.
</api>

<api name="when">
@function
  Registers a function to be called when `send()` is called.

@param callback {function}
  A function that will be called when `send()` is called.  It is called with a
  single argument, one of the following strings describing the reason for
  unload: `"uninstall"`, `"disable"`, `"shutdown"`, `"upgrade"`, or
  `"downgrade"`.  (On Gecko 1.9.2-based applications such as Firefox 3.6,
  `"upgrade"` and `"downgrade"` are not available, and `"shutdown"` will be sent
  in their place.)  If a reason could not be determined, `undefined` will be
  passed instead.  Note that if an add-on is unloaded with reason `"disable"`,
  it will not be notified about `"uninstall"` while it is disabled.  A solution
  to this issue is being investigated; see bug 571049.
</api>

<api name="send">
@function
  Sends an "unload signal", thereby triggering all callbacks registered via
  `when()`. In general, this function need not be manually called; it is
  automatically triggered by the embedder.

@param [reason] {string}
  An optional string describing the reason for unload; see `unload.when()`.
</api>
