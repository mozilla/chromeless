'use strict';

// Exposing private methods as public in order to test
const EventEmitter = require('events').EventEmitter.compose({
  listeners: function(type) this._listeners(type),
  emit: function() this._emit.apply(this, arguments),
  emitOnObject: function() this._emitOnObject.apply(this, arguments),
  removeAllListeners: function(type) this._removeAllListeners(type)
});

exports['test:add listeners'] = function(test) {
  let e = new EventEmitter();

  let events_new_listener_emited = [];
  let times_hello_emited = 0;

  e.on("newListener", function (event, listener) {
    events_new_listener_emited.push(event)
  })

  e.on("hello", function (a, b) {
    times_hello_emited += 1
    test.assertEqual("a", a)
    test.assertEqual("b", b)
    test.assertEqual(this, e, '`this` pseudo-variable is bound to instance');
  })

  e.emit("hello", "a", "b")
};

exports['test:remove listeners'] = function(test) {
  let count = 0;

  function listener1 () {
    count++;
  }
  function listener2 () {
    count++;
  }
  function listener3 () {
    count++;
  }

  let e1 = new EventEmitter();
  e1.on("hello", listener1);
  test.assertEqual(1, e1.listeners('hello').length);
  e1.removeListener("hello", listener1);
  test.assertEqual(0, e1.listeners('hello').length);

  let e2 = new EventEmitter();
  e2.on("hello", listener1);
  test.assertEqual(1, e2.listeners('hello').length);
  e2.removeListener("hello", listener2);
  test.assertEqual(1, e2.listeners('hello').length);
  test.assertEqual(listener1, e2.listeners('hello')[0]);

  let e3 = new EventEmitter();
  e3.on("hello", listener1);
  test.assertEqual(1, e3.listeners('hello').length);
  e3.on("hello", listener2);
  test.assertEqual(2, e3.listeners('hello').length);
  e3.removeListener("hello", listener1);
  test.assertEqual(1, e3.listeners('hello').length);
  test.assertEqual(listener2, e3.listeners('hello')[0]);
};

exports['test: modify in emit'] = function(test) {
  let callbacks_called = [ ];
  let e = new EventEmitter();

  function callback1() {
    callbacks_called.push("callback1");
    e.on("foo", callback2);
    e.on("foo", callback3);
    e.removeListener("foo", callback1);
  }
  function callback2() {
    callbacks_called.push("callback2");
    e.removeListener("foo", callback2);
  }
  function callback3() {
    callbacks_called.push("callback3");
    e.removeListener("foo", callback3);
  }

  e.on("foo", callback1);
  test.assertEqual(1, e.listeners("foo").length);

  e.emit("foo");
  test.assertEqual(2, e.listeners("foo").length);
  test.assertEqual(1, callbacks_called.length);
  test.assertEqual('callback1', callbacks_called[0]);

  e.emit("foo");
  test.assertEqual(0, e.listeners("foo").length);
  test.assertEqual(3, callbacks_called.length);
  test.assertEqual('callback1', callbacks_called[0]);
  test.assertEqual('callback2', callbacks_called[1]);
  test.assertEqual('callback3', callbacks_called[2]);

  e.emit("foo");
  test.assertEqual(0, e.listeners("foo").length);
  test.assertEqual(3, callbacks_called.length);
  test.assertEqual('callback1', callbacks_called[0]);
  test.assertEqual('callback2', callbacks_called[1]);
  test.assertEqual('callback3', callbacks_called[2]);

  e.on("foo", callback1);
  e.on("foo", callback2);
  test.assertEqual(2, e.listeners("foo").length);
  e.removeAllListeners("foo");
  test.assertEqual(0, e.listeners("foo").length);

  // Verify that removing callbacks while in emit allows emits to propagate to
  // all listeners
  callbacks_called = [ ];

  e.on("foo", callback2);
  e.on("foo", callback3);
  test.assertEqual(2, e.listeners("foo").length);
  e.emit("foo");
  test.assertEqual(2, callbacks_called.length);
  test.assertEqual('callback2', callbacks_called[0]);
  test.assertEqual('callback3', callbacks_called[1]);
  test.assertEqual(0, e.listeners("foo").length);
};

exports['test:adding same listener'] = function(test) {
  function foo() {}
  let e = new EventEmitter();
  e.on("foo", foo);
  e.on("foo", foo);
  test.assertEqual(
    1,
    e.listeners("foo").length,
    "listener reregistration is ignored"
 );
}

exports['test:errors are reported if listener throws'] = function(test) {
  let e = new EventEmitter(),
      reported = false;
  e.on('error', function(e) reported = true)
  e.on('boom', function() { throw new Error('Boom!') });
  e.emit('boom', 3);
  test.assert(reported, 'error should be reported through event');
};

exports['test:emitOnObject'] = function(test) {
  let e = new EventEmitter();

  e.on("foo", function() {
    test.assertEqual(this, e, "`this` should be emitter");
  });
  e.emitOnObject(e, "foo");

  e.on("bar", function() {
    test.assertEqual(this, obj, "`this` should be other object");
  });
  let obj = {};
  e.emitOnObject(obj, "bar");
};
