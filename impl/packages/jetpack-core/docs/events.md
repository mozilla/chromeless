The `events` module provides base API for emitting events.

This module is not intended to be used directly by programs. Rather, it is
intended to be used by other modules that provide APIs to programs.

<api name="EventEmitter">
@method
The EventEmitter is a is the base building block for all compositions that
would need to broadcast data to multiple consumers.
</api>

EventEmitter
------------
Please note that `EventEmitter` does not expose neither a method for emitting
events nor a list of available event listeners as its public API. Obviously
both are accessible but from the instance itself through the private API.

<api name="on">
@method
Registers an event `listener` that will be called when events of
specified `type` are emitted.

If the `listener` is already registered for this `type`, a call to this
method has no effect.

If the event listener is being registered while an event is being processed,
the event listener is not called during the current emit.

@param type {String}
  The type of event.
@param listener {Function}
  The listener function that processes the event.
</api>
**Example:**

    // worker is instance of EventEmitter
    worker.on('message', function (data) {
      console.log('data received: ' + data)
    });

<api name="removeListener">
@method
Unregisters an event `listener` for the specified event `type`.

If the `listener` is not registered for this `type`, a call to this
method has no effect.

If an event listener is removed while an event is being processed, it is
still triggered by the current emit. After it is removed, the event listener
is never invoked again (unless registered again for future processing).

@param type {String}
  The type of event.
@param listener {Function}
  The listener function that processes the event.
</api>

