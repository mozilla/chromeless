/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
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
 *   Irakli Gozalishvili <gozala@mozilla.com>
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

const ES5 = require('es5');
const { Trait } = require('traits');
const { EventEmitter } = require('events');
const { Ci, Cu, Cc } = require('chrome');
const timer = require('timer');
const { toFilename } = require('url');
const file = require('file');
const unload = require('unload');

const JS_VERSION = '1.8';

/**
 * Extended `EventEmitter` allowing us to emit events asynchronously.
 */
const AsyncEventEmitter = EventEmitter.compose({
  /**
   * Emits event in the next turn of event loop.
   */
  _asyncEmit: function _asyncEmit() {
    timer.setTimeout(function emitter(emit, scope, params) {
      emit.apply(scope, params);
    }, 0, this._emit, this, arguments)
  }
});

/**
 * Function for sending data to the port. Used to send messages
 * form the worker to the symbiont and other way round.
 * Function validates that data is a `JSON` or primitive value and emits
 * 'message' event on the port in the next turn of the event loop.
 * _Later this will be sending data across process boundaries._
 * @param {JSON|String|Number|Boolean} data
 */
function postMessage(data)
  this._port._asyncEmit('message',  JSON.parse(JSON.stringify(data)));


/**
 * Local trait providing implementation of the workers global scope.
 * Used to configure global object in the sandbox.
 * @see http://www.w3.org/TR/workers/#workerglobalscope
 */
const WorkerGlobalScope = AsyncEventEmitter.compose({
  on: Trait.required,
  _removeAllListeners: Trait.required,

  // wrapped functions from `'timer'` module.
  // Wrapper adds `try catch` blocks to the callbacks in order to
  // emit `error` event on a symbiont if exception is thrown in
  // the Worker global scope.
  // @see http://www.w3.org/TR/workers/#workerutils
  setTimeout: function setTimeout(callback, delay) {
    let params = Array.slice(arguments, 2);
    return timer.setTimeout(function(port) {
      try {
        callback.apply(null, params);
      } catch(e) {
        port._asyncEmit('error', e);
      }
    }, delay, this._port);
  },
  clearTimeout: timer.clearTimeout,

  setInterval: function setInterval(callback, delay) {
    let params = Array.slice(arguments, 2);
    return timers.setInterval(function(port) {
      try {
        callback.apply(null, params); 
      } catch(e) {
        port._asyncEmit('error', e);
      }
    }, delay, this._port);
  },
  clearInterval: timer.clearInterval,

  /**
   * `onMessage` function defined in the global scope of the worker context.
   */
  get onMessage() this._onMessage,
  set onMessage(value) {
    let listener = this._onMessage;
    if (listener && value !== listener) {
      this.removeListener('message', listener);
      this._onMessage = undefined;
    }
    if (value)
      this.on('message', this._onMessage = value);
  },
  _onMessage: undefined,

  /**
   * @see postMesssage
   */
  postMessage: postMessage,

  /**
   * Alias to the global scope in the context of worker. Similar to
   * `window` concept.
   */
  get self() this._public,


  /**
   * Configures sandbox and loads content scripts into it.
   * @param {Worker} port
   *    content worker
   */
  constructor: function WorkerGlobalScope(port) {
    // connect ports
    this._port = port;
    port._port = this;

    this.on('unload', this._destructor = this._destructor.bind(this));

    // XXX I think the principal should be `this._port._frame.contentWindow`,
    // but script doesn't work correctly when I set it to that value.
    // Events don't get registered; even dump() fails.
    //
    // FIXME: figure out the problem and resolve it, so we can restrict
    // the sandbox to the same set of privileges the page has (plus any others
    // it gets to access through the object that created it).
    //
    // XXX when testing `this._port.frame.contentWindow`, I found that setting
    // the principal to its `this._port.frame.contentWindow.wrappedJSObject`
    // resolved some test leaks; that was before I started clearing the
    // principal of the sandbox on unload, though, so perhaps it is no longer
    // a problem.
    let sandbox = this._sandbox = new Cu.Sandbox(
      Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal)
    );

    // Shimming natives in sandbox so that they support ES5 features
    ES5.init(sandbox.Object, sandbox.Array, sandbox.Function);

    let window = port._window;
    let publicAPI = this._public;

    let keys = Object.getOwnPropertyNames(publicAPI);
    for each (let key in keys) {
      if ('onMessage' === key) continue;
      Object.defineProperty(
        sandbox, key, Object.getOwnPropertyDescriptor(publicAPI, key)
      );
    }
    Object.defineProperties(sandbox, {
      onMessage: {
        get: function() publicAPI.onMesssage,
        set: function(value) publicAPI.onMessage = value
      },
      console: { value: console },
   });
    // Chain the global object for the sandbox to the global object for
    // the frame.  This supports JavaScript libraries like jQuery that depend
    // on the presence of certain properties in the global object, like window,
    // document, location, and navigator.
    sandbox.__proto__ = window;
    // Alternate approach:
    // Define each individual global on which JavaScript libraries depend
    // in the global object of the sandbox.  This is hard to get right,
    // since it requires a priori knowledge of the libraries developers use,
    // and exceptions in those libraries aren't always reported.  It's also
    // brittle, prone to breaking when those libraries change.  But it might
    // make it easier to avoid namespace conflicts.
    // In my testing with jQuery, I found that the library needed window,
    // document, location, and navigator to avoid throwing exceptions,
    // although even with those globals defined, the library still doesn't
    // work, so it also needs something else about which it unfortunately does
    // not complain.
    // sandbox.window = window;
    // sandbox.document = window.document;
    // sandbox.location = window.location;
    // sandbox.navigator = window.navigator;

    // The order of `contentScriptURL` and `contentScript` evaluation is
    // intentional, so programs can load libraries like jQuery from script URLs
    // and use them in scripts.
    let { contentScriptURL, contentScript } = port;
    if (contentScriptURL) {
      if (Array.isArray(contentScriptURL))
        this._importScripts.apply(this, contentScriptURL);
      else
        this._importScripts(contentScriptURL);
    }
    if (contentScript) {
      this._evaluate(
        Array.isArray(contentScript) ? contentScript.join(';\n') : contentScript
      );
    }
  },
  _destructor: function _destructor() {
    this._removeAllListeners();
    let publicAPI = this._public,
        sandbox = this._sandbox;
    delete sandbox.__proto__;
    for (let key in publicAPI)
      delete sandbox[key];
    this._sandbox = null;
    this._port = null;
    this._onMessage = undefined;
  },
  /**
   * JavaScript sandbox where all the content scripts are evaluated.
   * {Sandbox}
   */
  _sandbox: null,
  /**
   * Reference to the worker.
   * @type {Worker}
   */
  _port: null,
  /**
   * Evaluates code in the sandbox.
   * @param {String} code
   *    JavaScript source to evaluate.
   * @param {String} [filename='javascript:' + code]
   *    Name of the file
   */
  _evaluate: function(code, filename) {
    filename = filename || 'javascript:' + code;
    try {
      Cu.evalInSandbox(code, this._sandbox, JS_VERSION, filename, 1);
    }
    catch(e) {
      this._port._asyncEmit('error', e);
    }
  },
  /**
   * Imports scripts to the sandbox by reading files under urls and
   * evaluating it's source. If exception occurs during evaluation
   * `"error"` event is emitted on the worker.
   * This is actually an analog to the `importScript` method in web
   * workers but in our case it's not exposed even though content
   * scripts may be able to do it synchronously since IO operation
   * takes place in the UI process.
   */
  _importScripts: function _importScripts(url) {
    let urls = Array.slice(arguments, 0);
    for each (let contentScriptURL in urls) {
      try {
        let filename = toFilename(contentScriptURL);
        this._evaluate(file.read(filename), filename);
      }
      catch(e) {
        this._port._asyncEmit('error', e)
      }
    }
  }
});

/**
 * Message-passing facility for communication between code running
 * in the content and add-on process.
 * @see https://jetpack.mozillalabs.com/sdk/latest/docs/#module/jetpack-core/content/worker
 */
const Worker = AsyncEventEmitter.compose({
  on: Trait.required,
  _asyncEmit: Trait.required,
  _removeAllListeners: Trait.required,

  /**
   * Sends a message to the worker's global scope. Method takes single
   * argument, which represents data to be send to the worker. The data may
   * be any primitive type value or `JSON`. Call of this method asynchronously
   * emits `message` event with data value in the global scope of this
   * symbiont.
   *
   * `message` event listeners can be set either by calling
   * `self.on` with a first argument string `"message"` or by
   * implementing `onMessage` function in the global scope of this worker.
   * @param {Number|String|JSON} data
   */
  postMessage: postMessage,

  constructor: function Worker(options) {
    let { contentScriptWhen, contentScriptURL, contentScript, window,
        onMessage, onError
    } = options || {};

    if (window)
      this._window = window;
    if (contentScriptURL)
      this.contentScriptURL = contentScriptURL;
    if (contentScript)
      this.contentScript = contentScript;
    if (onError)
        this.on('error', onError);
    if (onMessage)
        this.on('message', onMessage);

    unload.when(this._deconstructWorker.bind(this));

    WorkerGlobalScope(this); // will set this._port pointing to the private API
  },

  /**
   * Tells _port to unload itself and removes all the references from itself.
   */
  _deconstructWorker: function _deconstructWorker() {
    this._removeAllListeners('message');
    this._removeAllListeners('error');
    if (this._port) // maybe unloaded before port is created
      this._port._emit('unload');
    this._port = null;
    this._window = null;
  },
  /**
   * Reference to the global scope of the worker.
   * @type {WorkerGlobalScope}
   */
  _port: null,

  /**
   * Reference to the window that is accessible from
   * the content scripts.
   * @type {Object}
   */
  _window: null,
});
exports.Worker = Worker;

