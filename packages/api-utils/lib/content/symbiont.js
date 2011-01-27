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
 *   Myk Melez <myk@mozilla.org> (Original Author)
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

const { Worker } = require('./worker');
const { Loader } = require('./loader');
const hiddenFrames = require("hidden-frame");
const observers = require('observer-service');
const unload = require("unload");
const xulApp = require("xul-app");

const HAS_DOCUMENT_ELEMENT_INSERTED =
        xulApp.versionInRange(xulApp.platformVersion, "2.0b6", "*");
const ON_START = HAS_DOCUMENT_ELEMENT_INSERTED ? 'document-element-inserted' :
                 'content-document-global-created';
const ON_READY = 'DOMContentLoaded';

/**
 * This trait is layered on top of `Worker` and in contrast to symbiont
 * Worker constructor requires `content` option that represents content
 * that will be loaded in the provided frame, if frame is not provided
 * Worker will create hidden one.
 */
const Symbiont = Worker.resolve({ constructor: '_onInit' }).compose({
  _window: Worker.required,
  _onInit: Worker.required,
  /**
   * The constructor requires all the options that are required by
   * `require('content').Worker` with the difference that the `frame` option
   * is optional. If `frame` is not provided, `contentURL` is expected.
   * @param {Object} options
   * @param {String} options.contentURL
   *    URL of a content to load into `this._frame` and create worker for.
   * @param {Element} [options.frame]
   *    iframe element that is used to load `options.contentURL` into.
   *    if frame is not provided hidden iframe will be created.
   */
  constructor: function Symbiont(options) {
    options = options || {};

    if ('contentURL' in options)
        this.contentURL = options.contentURL;
    if ('contentScriptWhen' in options)
      this.contentScriptWhen = options.contentScriptWhen;
    if ('contentScriptFile' in options)
      this.contentScriptFile = options.contentScriptFile;
    if ('contentScript' in options)
      this.contentScript = options.contentScript;
    if ('allow' in options)
      this.allow = options.allow;
    if ('onError' in options)
        this.on('error', options.onError);
    if ('onMessage' in options)
        this.on('message', options.onMessage);
    if ('frame' in options) {
      this._initFrame(options.frame);
    }
    else {
      let self = this;
       hiddenFrames.add(hiddenFrames.HiddenFrame({
        onReady: function onFrame() {
          self._initFrame(this.element);
        }
      }));
    }

    unload.when(this._destructor.bind(this));
  },
  _destructor: function _destructor() {
    // The frame might not have been initialized yet.
    if (!this._frame)
      return;

    if ('ready' === this.contentScriptWhen)
      this._frame.removeEventListener(ON_READY, this._onReady, true);
    else
      observers.remove(ON_START, this._onStart);

    this._frame = null;
  },
  /**
   * XUL iframe or browser elements with attribute `type` being `content`.
   * Used to create `ContentSymbiont` from.
   * @type {nsIFrame|nsIBrowser}
   */
  _frame: null,
 /**
   * Listener to the `'frameReady"` event (emitted when `iframe` is ready).
   * Removes listener, sets right permissions to the frame and loads content.
   */
  _initFrame: function _initFrame(frame) {
    this._frame = frame;
    frame.docShell.allowJavascript = this.allow.script;
    frame.setAttribute("src", this._contentURL);
    if ('ready' === this.contentScriptWhen) {
      frame.addEventListener(
        ON_READY,
        this._onReady = this._onReady.bind(this),
        true
      );
    } else {
      observers.add(ON_START, this._onStart = this._onStart.bind(this));
    }
  },
  /**
   * Creates port when the DOM is ready. Called if the value of
   * `contentScriptWhen` is "ready".
   */
  _onReady: function _onReady(event) {
    let frame = this._frame;
    if (event.target == frame.contentDocument) {
      frame.removeEventListener(ON_READY, this._onReady, true);
      this._window = frame.contentWindow.wrappedJSObject;
      this._onInit();
    }
  },
  /**
   * Creates port when the global object is created. Called if the value of
   * `contentScriptWhen` is "start".
   */
  _onStart: function _onStart(domObj) {
    let window = HAS_DOCUMENT_ELEMENT_INSERTED ? domObj.defaultView : domObj;
    if (window == this._frame.contentWindow) {
      observers.remove(ON_START, this._onStart);
      this._window = window.wrappedJSObject;
      this._onInit();
    }
  }
}, Loader);
exports.Symbiont = Symbiont;

