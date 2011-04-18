const { Cc, Ci, components: { Constructor: CC } } = require("chrome")
  ,   { EventEmitter } = require('pure_js_events')
  ,   { ByteReader, ByteWriter } = require('byte-streams')
  ,   { TextReader, TextWriter } = require('text-streams')

const SocketServer = 
        CC("@mozilla.org/network/server-socket;1", "nsIServerSocket", "init")
  ,   TransportSevice = Cc["@mozilla.org/network/socket-transport-service;1"].
        getService(Ci.nsISocketTransportService)
  ,   Pump = CC(
        "@mozilla.org/network/input-stream-pump;1", "nsIInputStreamPump", "init"
      )
  ,   SocketTranport = Ci.nsISocketTransport

const BACKLOG = -1
  ,   CONNECTING = 'opening'
  ,   OPEN  = 'open'
  ,   CLOSED = 'closed'
  ,   READ = 'readOnly'
  ,   WRITE = 'writeOnly'
  ,   ENCODING_UTF8 = 'utf-8'
  ,   ENCODING_BINARY = 'binary'

  , servers = {}
  , streams = {}

let GUID = 0

function isPort(x) parseInt(x) >= 0

require('unload').when(function unload() {
  for each(let server in servers) server.close()
  for each(let stream in streams) stream.destroy()
})

function Stream() {
  let guid = ++ GUID
  return streams[guid] = 
  { __proto__: Stream.prototype
  , _guid: ++ guid
  }
}
Stream.prototype = 
{ __proto__: EventEmitter.prototype
, constructor: Stream
, _encoding: ENCODING_UTF8
, _resolving: null
, _readable: null
, _writable: null
, _port: null
, _host: null

, _readers: null
, _writers: null
    
, _transport: null
, _rawInput: null
, _rawOutput: null
, _status: null

, get host() this._transport.host
, get port() this._transport.port
, get remoteAddress() this.host + ':' + this.port
, get encoding() this._encoding
, get readable() this._readable
, get writable() this._writable
, get readyState() {
    if (this._resolving) return CONNECTING
    else if (this._readable && this._writable) return OPEN
    else if (this._readable && !this._writable) return READ
    else if (!this._readable && this._writable) return WRITE
    else return CLOSED
  }
, setEncoding: function setEncoding(value) this._encoding = value

, _lastState: null
, _onReadyStateChange: function _onReadyStateChange() {
    let state = this.readyState
    if (this._lastState != state) {
      this._emit('readyState', this._lastState = state)
      switch (state) {
        case CONNECTING:
          break
        case OPEN:
          this._emit('connect')
          break
        case WRITE:
          this._emit('end')
          break
        case READ:
          break
        case CLOSED:
          this._emit('close')
          break
      }
    }
  }
, open: function open() {
    throw new Error('Not yet implemented')
  }
  /**
   *  Called to signify the beginning of an asynchronous request
   */
, _onConnect: function _onConnect() this._emit('connect')
, connect: function connect(port, host) {
    try {
      this._transport = TransportSevice.
        createTransport(null, 0, host, port, null)
      this._connect()
    } catch(e) {
      this._emit('error', e)
    }
  }
, _connect: function _connect() {
    let transport = this._transport

    this._rawOutput = transport.openOutputStream(0, 0, 0)
    this._rawInput = transport.openInputStream(0, 0, 0)

    new Pump(this._rawInput, -1, -1, 0, 0, false).asyncRead(
    { onStartRequest: this._onConnect.bind(this)
    , onStopRequest: this._onEnd.bind(this)
    , onDataAvailable: this._onData.bind(this)
    }, null)

    transport.setEventSink(
      { onTransportStatus: this._onStatus.bind(this) }, null
    )
  }
, _onStatus: function _onStatus(transport, status, progress, total) {
    this._status = status
    let state = this.readyState
    switch (status) {
      case SocketTranport.STATUS_RESOLVING:
        break
      case SocketTranport.STATUS_CONNECTING_TO:
        this._resolving = true
        break
      case SocketTranport.STATUS_CONNECTED_TO:
        this._resolving = false
        this._readable = true
        this._writable = true
        break
      case SocketTranport.STATUS_SENDING_TO:
        break
      case SocketTranport.STATUS_WAITING_FOR:
        break
      case SocketTranport.STATUS_RECEIVING_FROM:
        break
    }
    this._onReadyStateChange()
  }
  /**
   * Called when the next chunk of data (corresponding to the
   * request) may be read without blocking the calling thread.
   */
, _onData: function _onData(request, context, stream, offset, count) {
    try {
      let encoding = this._encoding
      let readers = this._readers || (this._readers = {})
      let reader = readers[encoding] || (readers[encoding] = 
        new (ENCODING_BINARY === encoding ? ByteReader : TextReader)
          (this._rawInput, encoding)
      )
      this._emit('data', reader.read(count))
    } catch(e) {
      this._emit('error', e)
    }
  }
, write: function write(buffer, encoding) {
    encoding = encoding || this._encoding
    try {
      let writers = this._writers || (this._writers = {})
      let writer = writers[encoding] || (writers[encoding] = 
        new (ENCODING_BINARY === encoding ? ByteWriter : TextWriter)
          (this._rawOutput, encoding)
      )
      writer.write(buffer)
    } catch(e) {
      this._emit('error', e)
    }
  }
  /**
   * Called to signify the end of an asynchronous request
   */
, _onEnd: function _onEnd(request, context, status) {
    this._readable = false
    this._onReadyStateChange()
  }
, end: function end() {
    try {
      this._readable = false
      let readers = this._readers
      for (let key in readers) {
        readers[key].close()
        delete readers[key]
      }

      this._writable = false
      let writers = this._writers
      for (let key in writers) {
        writers[key].close()
        delete writers[key]
      }

      this._transport.close(0)
      this._onReadyStateChange()
    } catch(e) {
      this._emit('error', e)
    }
  }
, destroy: function destroy() {
    this.end()
    this._removeAllListeners('data')
    this._removeAllListeners('error')
    this._removeAllListeners('connect')
    this._removeAllListeners('end')
    this._removeAllListeners('secure')
    this._removeAllListeners('timeout')
    this._removeAllListeners('close')
    delete this._rawInput
    delete this._rawOutput
    delete this._transport
    delete streams[this._guid]
  }
}
exports.Stream = Stream

function createConnection(port, host) {
  let stream = Stream()
  stream.connect(port, host)
  return stream
}
exports.createConnection = createConnection

function Server(listener) {
  let guid = ++ GUID
  let server = servers[guid] =
  { __proto__: Server.prototype
  , _guid: guid 
  }
  if (listener) server.on('connection', listener)
  return server
}
Server.prototype =
{ __proto__: EventEmitter.prototype
, constructor: Server
, type: null
, loopbackOnly: false
  /**
   * Stops the server from accepting new connections. This function is
   * asynchronous, the server is finally closed when the server emits a
   * 'close' event.
   */
, close: function() {
    this._removeAllListeners('connection')
    this._removeAllListeners('error')
    this._removeAllListeners('listening')
    this._server.close()
    delete servers[this._guid]
  }
, listen: function(port, host, callback) {
    try {
      if (this.fd) throw new Error('Server already opened');
      if (!callback) [callback, host] = [host, callback]
      if (callback) this.on('listening', callback)
      if (isPort(port)) {
        this.type = 'tcp'
        ;(this._server = new SocketServer(port, this.loopbackOnly, BACKLOG)).
          asyncListen(
          { onSocketAccepted: this._onConnection.bind(this)
          , onStopListening: this._onClose.bind(this)
          })
      }
      this._emit('listening')
    } catch(e) {
      this._emit('error', e)
    }
  }
, _onConnection: function _onConnection(server, transport) {
    try {
      let stream = Stream()
      stream._transport = transport
      stream._readable = true
      stream._writable = true
      stream.server = this
      stream._connect()
      this._emit('connection', stream)
    } catch(e) {
      this._emit('error', e)
    }
  }
, _onClose: function _onClose(server, socket) {
    try {
      this._emit('close')
    } catch(e) {
      this._emit('error', e)
    }
  }
}
exports.Server = Server
exports.createServer = function createServer(listener) Server(listener)

