/** ES5 15.4.3.2 */
if (!Array.isArray) Array.isArray = function(object)
    Object.prototype.toString.call(object) == '[object Array]'

const ERROR_TYPE = 'error',
    UNCAUGHT_ERROR = 'Uncaught, unspecified "error" event.',
    BAD_LISTENER = 'type of listener should be a function'

exports.EventEmitter = EventEmitter
function EventEmitter() { __proto__: EventEmitter.prototype }
EventEmitter.prototype = {
    constructor: EventEmitter,
    /**
     * Returns an array of listeners for the specified event. This array can
     * be manipulated, e.g. to remove listeners
     * @param {type} String         Event types are a camel-cased strings
     */
    listeners: function listeners(type) {
        let events = this._events || (this._events = {})
        if (!events[type]) events[type] = []
        if (!Array.isArray(events[type])) events[type] = [events[type]]
        return events[type]
    },
    /**
     * Execute each of the listeners in order with the supplied arguments.
     * @param {type} String         Event types are a camel-cased strings
     */
    _emit: function _emit(type, param1, param2) {
        let events = this._events
        // If there is no 'error' event listener then throw.
        if (type === ERROR_TYPE) {
            if (
                !events ||
                !events.error ||
                (Array.isArray(events.error) && !events.error.length)
            ) {
                if (param1 instanceof Error) throw param1
                else throw new Error(UNCAUGHT_ERROR)
            }
        }
        if (!events) return false
        if (!events[type]) return false
        if (typeof events[type] == 'function') {
            // fast case
            if (arguments.length < 3) events[type].call(this, param1, param2)
            // slower
            else events[type].apply(this, Array.slice(arguments, 1))
            return true
        } else if (Array.isArray(events[type])) {
            let params = Array.slice(arguments, 1),
                listeners = events[type].slice(0)
            for each(let listener in listeners) listener.apply(this, params)
            return true
        } else return false
    },
    /**
     * Adds a listener to the end of the listeners array for the specified
     * event.
     * @param {type} String         Event types are a camel-cased strings
     * @param {listener} Function
     *      Function that will be executed when an event is emitted
     * @exapmle
     *      server.on('stream', function (stream) {
     *          console.log('someone connected!')
     *      })
     */
    on: function on(type, listener) {
        if ('function' !== typeof listener) throw new Error(BAD_LISTENER)
        let events = this._events || (this._events = {})
        // To avoid recursion in the case that type == "newListeners"! Before
        // adding it to the listeners, first emit "newListeners".
        this._emit("newListener", type, listener)
        // Optimize the case of one listener. Don't need an extra array
        if (!events[type]) events[type] = listener
        // If we've already got an array, just append.
        else if (Array.isArray(events[type])) events[type].push(listener)
        // Adding the second element, need to change to array.
        else events[type] = [events[type], listener]
        return this
    },
    /**
     * Remove a listener from the listener array for the specified event.
     * Caution: changes array indices in the listener array behind the
     * listener.
     * @param {type} String         Event types are a camel-cased strings
     * @param {listener} Function
     *      Function that will be executed when an event is emitted
     */
    removeListener: function removeListener(type, listener) {
        if ('function' !== typeof listener) throw new Error(BAD_LISTENER)
        // does not use listeners(), so no side effect of creating
        // _events[type]
        let events = this._events
        if (!events || !events[type]) return this
        let list = events[type]
        if (Array.isArray(list)) {
            let index = list.indexOf(listener)
            if (0 <= index) list.splice(index, 1)
        } else if (events[type] === listener) events[type] = null
        return this
    },
    /**
     * Removes all listeners from the listener array for the specified event.
     * @param {type} String         Event types are a camel-cased strings
     */
    _removeAllListeners: function _removeAllListeners(type) {
        // does not use listeners(), so no side effect of creating 
        // _events[type]
        let events = this._events
        if (type && events && events[type]) events[type] = null
        return this
    }
}
