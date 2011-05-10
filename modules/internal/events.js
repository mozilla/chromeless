/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Irakli Gozalishvili <gozala@mozilla.com> (Original Author)
 *   Drew Willcoxon <adw@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

const ERROR_TYPE = 'error',
      UNCAUGHT_ERROR = 'An error event was dispatched for which there was'
        + ' no listener.',
      BAD_LISTENER = 'The event listener must be a function.';
/**
 * This object is used to create an `EventEmitter` that, useful for composing
 * objects that emit events. It implements an interface like `EventTarget` from
 * DOM Level 2, which is implemented by Node objects in implementations that
 * support the DOM Event Model.
 * @see http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget
 * @see http://nodejs.org/api.html#EventEmitter
 * @see http://livedocs.adobe.com/flash/9.0/ActionScriptLangRefV3/flash/events/EventDispatcher.html
 */
const eventEmitter =  {
  /**
   * Registers an event `listener` that is called every time events of
   * specified `type` are emitted.
   * @param {String} type
   *    The type of event.
   * @param {Function} listener
   *    The listener function that processes the event.
   * @example
   *      worker.on('message', function (data) {
   *          console.log('data received: ' + data)
   *      })
   */
  on: function on(type, listener) {
    if ('function' !== typeof listener)
      throw new Error(BAD_LISTENER);
    let listeners = this._listeners(type);
    if (0 > listeners.indexOf(listener))
      listeners.push(listener);
    return this._public;
  },

  /**
   * Registers an event `listener` that is called once the next time an event
   * of the specified `type` is emitted.
   * @param {String} type
   *    The type of the event.
   * @param {Function} listener
   *    The listener function that processes the event.
   */
  once: function once(type, listener) {
    this.on(type, function selfRemovableListener() {
      this.removeListener(type, selfRemovableListener);
      listener.apply(this, arguments);
    });
  },

  /**
   * Unregister `listener` for the specified event type.
   * @param {String} type
   *    The type of event.
   * @param {Function} listener
   *    The listener function that processes the event.
   */
  removeListener: function removeListener(type, listener) {
    if ('function' !== typeof listener)
      throw new Error(BAD_LISTENER);
    let listeners = this._listeners(type),
        index = listeners.indexOf(listener);
    if (0 <= index)
      listeners.splice(index, 1);
    return this._public;
  },

  /**
   * Hash of listeners on this EventEmitter.
   */
  _events: null,

  /**
   * Returns an array of listeners for the specified event `type`. This array
   * can be manipulated, e.g. to remove listeners.
   * @param {String} type
   *    The type of event.
   */
  _listeners: function listeners(type) {
    let events = this._events || (this._events = {});
    return events[type] || (events[type] = []);
  },

  /**
   * Execute each of the listeners in order with the supplied arguments.
   * Returns `true` if listener for this event was called, `false` if there are
   * no listeners for this event `type`.
   *
   * All the exceptions that are thrown by listeners during the emit
   * are caught and can be handled by listeners of 'error' event. Thrown
   * exceptions are passed as an argument to an 'error' event listener.
   * If no 'error' listener is registered exception will propagate to a
   * caller of this method.
   *
   * **It's recommended to have a default 'error' listener in all the complete
   * composition that in worst case may dump errors to the console.**
   *
   * @param {String} type
   *    The type of event.
   * @params {Object|Number|String|Boolean}
   *    Arguments that will be passed to listeners.
   * @returns {Boolean}
   */
  _emit: function _emit(type, event) {
    let args = Array.slice(arguments);
    args.unshift(this._public);
    return this._emitOnObject.apply(this, args);
  },

  /**
   * A version of _emit that lets you specify the object on which listeners are
   * called.  This is a hack that is sometimes necessary when such an object
   * (exports, for example) cannot be an EventEmitter for some reason, but other
   * object(s) managing events for the object are EventEmitters.  Once bug
   * 577782 is fixed, this method shouldn't be necessary.
   *
   * @param {object} targetObj
   *    The object on which listeners will be called.
   * @param {string} type
   *    The event name.
   * @param {value} event
   *    The first argument to pass to listeners.
   * @param {value} ...
   *    More arguments to pass to listeners.
   * @returns {boolean}
   */
  _emitOnObject: function _emitOnObject(targetObj, type, event /* , ... */) {
    let listeners = this._listeners(type).slice(0);
    // If there is no 'error' event listener then throw.
    if (type === ERROR_TYPE && !listeners.length)
      console.exception(event);
    if (!listeners.length)
      return false;
    let params = Array.slice(arguments, 2);
    for each (let listener in listeners) {
      try {
        listener.apply(targetObj, params);
      } catch(e) {
        this._emit('error', e);
      }
    }
    return true;
  },

  /**
   * Removes all the event listeners for the specified event `type`.
   * @param {String} type
   *    The type of event.
   */
  _removeAllListeners: function _removeAllListeners(type) {
    this._listeners(type).splice(0);
    return this;
  }
};
exports.EventEmitter = require("traits").Trait.compose(eventEmitter);
exports.EventEmitterTrait = require('light-traits').Trait(eventEmitter);
