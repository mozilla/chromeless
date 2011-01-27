let net = require("net")

let tests_run = 0

function pingPongTest (test, port, host) {
    test.waitUntilDone()
    let 
        N = 1000,
        count = 0,
        sent_final_ping = false

    let server = net.createServer(function (socket) {
        socket.id = 'server:'
        test.assertEqual(server, socket.server)
        //socket.setNoDelay()
        socket.timeout = 0

        socket.setEncoding('utf8')
        socket.on("data", function (data) {
            test.assertEqual(true, socket.writable, 'should be writable on data')
            test.assertEqual(true, socket.readable, 'should be readable on data')
            test.assertEqual(true, count <= N, 'sholud be less then N ??')
            if (/PING/.exec(data)) socket.write("PONG")
        })

        socket.on("end", function () {
            test.assertEqual(true, socket.writable, 'when ended should be writable')
            test.assertEqual(false, socket.readable, 'when ended should not be readable')
            socket.end()
        })

        socket.on("error", function (e) {
            throw e
        })

        socket.on("close", function () {
            test.assertEqual(false, socket.writable, 'when closed should not be writable')
            test.assertEqual(false, socket.readable, 'when closed should not be readable')
            socket.server.close()
            test.done()
        })
    })


    server.listen(port, host, function () {
        let client = net.createConnection(port, host)
        client.id = 'client:'
        client.setEncoding('ascii')
        client.on("connect", function() {
            test.assertEqual(true, client.readable, 'should be readable when connect')
            test.assertEqual(true, client.writable, 'should be writable when connect')
            client.write("PING")
        })

        client.on("data", function (data) {
            test.assertEqual("PONG", data)
            count += 1
            
            if (sent_final_ping) {
                test.assertEqual(false, client.writable, 'when final should be not be writable')
                test.assertEqual(true, client.readable, 'when final still should be readable')
                return
            } else {
                test.assertEqual(true, client.writable, 'if not final should be writable')
                test.assertEqual(true, client.readable, 'if not final should be readable')
            }
            
            if (count < N) {
                client.write("PING")
            } else {
                sent_final_ping = true
                client.write("PING")
                client.end()
            }
        })

        client.on("close", function onClose() {
            // unlike in node last pong won't be delivered since input / output is closed togather
            test.assertEqual(N, count, 'comparing if number of writes is correct')
            test.assertEqual(true, sent_final_ping)
            tests_run += 1
        })

        client.on("error", function (e) {
            throw e
        })
    })
}

/* All are run at once, so run on different ports */
exports['test:ping-pong on localhost:20989'] = function(test) {
    pingPongTest(test, 20989, "localhost")
}
/*
exports['test:ping-pong on localhost:20988'] = function(test) {
    pingPongTest(test, 20988)
}
pingPongTest(20997, "::1");
pingPongTest("/tmp/pingpong.sock");

process.on("exit", function () {
  assert.equal(4, tests_run)
  puts('done')
})
*/
