exports['test:add listeners'] = function(test) {
    let { EventEmitter } = require('net/events')
    let e = new EventEmitter()

    let events_new_listener_emited = []
    let times_hello_emited = 0

    e.on("newListener", function (event, listener) {
        console.log("newListener: " + event)
        events_new_listener_emited.push(event)
    })

    e.on("hello", function (a, b) {
        console.log("hello")
        times_hello_emited += 1
        test.assertEqual("a", a)
        test.assertEqual("b", b)
    })

    console.log("start")

    e._emit("hello", "a", "b")
}

exports['test:remove listeners'] = function(test) {
    let { EventEmitter } = require('net/events')
    let count = 0

    function listener1 () {
        console.log('listener1')
        count++
    }
    function listener2 () {
        console.log('listener2')
        count++
    }
    function listener3 () {
        console.log('listener3')
        count++
    }

    let e1 = new EventEmitter()
    e1.on("hello", listener1)
    test.assertEqual(1, e1.listeners('hello').length)
    e1.removeListener("hello", listener1)
    test.assertEqual(0, e1.listeners('hello').length)

    let e2 = new EventEmitter()
    e2.on("hello", listener1)
    test.assertEqual(1, e2.listeners('hello').length)
    e2.removeListener("hello", listener2)
    test.assertEqual(1, e2.listeners('hello').length)
    test.assertEqual(listener1, e2.listeners('hello')[0])

    let e3 = new EventEmitter()
    e3.on("hello", listener1)
    test.assertEqual(1, e3.listeners('hello').length)
    e3.on("hello", listener2)
    test.assertEqual(2, e3.listeners('hello').length)
    e3.removeListener("hello", listener1);
    test.assertEqual(1, e3.listeners('hello').length)
    test.assertEqual(listener2, e3.listeners('hello')[0])
}

exports['test: modify in emit'] = function(test) {
    let { EventEmitter } = require('net/events')
    
    let callbacks_called = [ ]
    let e = new EventEmitter()

    function callback1() {
        callbacks_called.push("callback1")
        e.on("foo", callback2)
        e.on("foo", callback3)
        e.removeListener("foo", callback1)
    }
    function callback2() {
        callbacks_called.push("callback2")
        e.removeListener("foo", callback2)
    }
    function callback3() {
        callbacks_called.push("callback3")
        e.removeListener("foo", callback3)
    }

    e.on("foo", callback1);
    test.assertEqual(1, e.listeners("foo").length)

    e._emit("foo")
    test.assertEqual(2, e.listeners("foo").length)
    test.assertEqual(1, callbacks_called.length)
    test.assertEqual('callback1', callbacks_called[0])

    e._emit("foo")
    test.assertEqual(0, e.listeners("foo").length)
    test.assertEqual(3, callbacks_called.length)
    test.assertEqual('callback1', callbacks_called[0])
    test.assertEqual('callback2', callbacks_called[1])
    test.assertEqual('callback3', callbacks_called[2])

    e._emit("foo")
    test.assertEqual(0, e.listeners("foo").length)
    test.assertEqual(3, callbacks_called.length)
    test.assertEqual('callback1', callbacks_called[0])
    test.assertEqual('callback2', callbacks_called[1])
    test.assertEqual('callback3', callbacks_called[2])

    e.on("foo", callback1)
    e.on("foo", callback2)
    test.assertEqual(2, e.listeners("foo").length)
    e._removeAllListeners("foo")
    test.assertEqual(0, e.listeners("foo").length)

    // Verify that removing callbacks while in emit allows emits to propagate to 
    // all listeners
    callbacks_called = [ ]

    e.on("foo", callback2)
    e.on("foo", callback3)
    test.assertEqual(2, e.listeners("foo").length)
    e._emit("foo")
    test.assertEqual(2, callbacks_called.length)
    test.assertEqual('callback2', callbacks_called[0])
    test.assertEqual('callback3', callbacks_called[1])
    test.assertEqual(0, e.listeners("foo").length)
}
