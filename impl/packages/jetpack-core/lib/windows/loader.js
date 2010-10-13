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
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Irakli Gozalishvili <gozala@mozilla.com> (Original author)
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

const { Cc, Ci } = require('chrome'),
      { setTimeout } = require("timer"),
      { Trait } = require('traits'),

      WM = Cc['@mozilla.org/appshell/window-mediator;1'].
        getService(Ci.nsIWindowMediator),

      URI_BROWSER = 'chrome://browser/content/browser.xul',
      NAME = '_blank',
      FEATURES = 'chrome,all,dialog=no',
      PARAMS = [ URI_BROWSER, NAME, FEATURES ],
      ON_LOAD = 'load',
      ON_UNLOAD = 'unload',
      STATE_LOADED = 'complete',
      BROWSER = 'navigator:browser';

/**
 * Trait provides private `_window` property and requires `_onLoad` property
 * that will be called when `_window` is loaded. If `_window` property value
 * is changed with already loaded window `_onLoad` still will be called.
 */
const WindowLoader = Trait.compose({
  /**
   * Internal listener that is called when window is loaded.
   * Please keep in mind that this trait will not handle exceptions that may
   * be thrown by this method so method itself should take care of
   * handling them.
   * @param {nsIWindow} window
   */
  _onLoad: Trait.required,
  /**
   * Internal listener that is called when `_window`'s DOM 'unload' event
   * is dispatched. Please note that this trait will not handle exceptions that
   * may be thrown by this method so method itself should take care of
   * handling them.
   */
  _onUnload: Trait.required,
  /**
   * Private window who's load event is being tracked. Once window is loaded
   * `_onLoad` is called.
   * @type {nsIWindow}
   */
  get _window() {
    if (this.__window) return this.__window
    let params = PARAMS;
    if (Array.isArray(this._params))
      params = PARAMS.concat(this._params);
    let browser =  WM.getMostRecentWindow(BROWSER);
    return this._window = browser.openDialog.apply(browser, params)
  },
  set _window(window) {
    let _window = this.__window;
    if (!window) window = null;
    if (window == _window) return;
    if (_window) {
      _window.removeEventListener(ON_UNLOAD, this.__unloadListener, true);
      _window.removeEventListener(ON_LOAD, this.__loadListener, true);
    }
    if (!window) return;
    window.addEventListener(
      ON_UNLOAD,
      this.__unloadListener ||
        (this.__unloadListener = this._unloadListener.bind(this))
      ,
      true
    );
    if (STATE_LOADED != window.document.readyState) {
      window.addEventListener(
        ON_LOAD,
        this.__loadListener ||
          (this.__loadListener = this._loadListener.bind(this))
        ,
        true
      );
    }
    else {
      // calling listener in another turn of the event loop
      setTimeout(this._onLoad.bind(this), 0, window);
    }
    return this.__window = window;
  },
  __window: null,
  /**
   * Internal method used for listening 'load' event on the `_window`.
   * Method takes care of removing itself from 'load' event listeners once
   * event is being handled.
   */
  _loadListener: function _loadListener(event) {
    let window = this._window;
    if (!event.target || event.target.defaultView != window) return;
    window.removeEventListener(ON_LOAD, this.__loadListener, true);
    this._onLoad(window);
  },
  __loadListener: null,
  /**
   * Internal method used for listening 'unload' event on the `_window`.
   * Method takes care of removing itself from 'unload' event listeners once
   * event is being handled.
   */
  _unloadListener: function _unloadListener(event) {
    let window = this._window;
    if (!event.target
      || event.target.defaultView != window
      || STATE_LOADED != window.document.readyState
    ) return;
    window.removeEventListener(ON_UNLOAD, this.__unloadListener, true);
    this._onUnload(window);
  },
  __unloadListener: null
});
exports.WindowLoader = WindowLoader;

