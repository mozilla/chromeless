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
 *   Felipe Gomes <felipc@gmail.com> (Original Author)
 *   Myk Melez <myk@mozilla.org>
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

const { Symbiont } = require("content");
const { Trait } = require("traits");
const { Registry } = require('utils/registry');

const ERR_ADD_BEFORE_POST =
  'You have to add the page before you can send a message to it.';

if (!require("xul-app").isOneOf(["Firefox", "Thunderbird"])) {
  throw new Error([
    "The page-worker module currently supports only Firefox and Thunderbird. ",
    "In the future, we would like it to support other applications, however. ",
    "Please see https://bugzilla.mozilla.org/show_bug.cgi?id=546740 for more ",
    "information."
  ].join(""));
}

const Page = Trait.compose(
  Symbiont.resolve({
    constructor: '_initSymbiont',
    _onInit: '_onInitSymbiont',
    postMessage: '_postMessage'
  }),
  {
    _frame: Trait.required,
    _initFrame: Trait.required,

    constructor: function Page(options) {
      let { contentURL, contentScriptURL, contentScript, contentScriptWhen,
        allow, onMessage, onError, onReady
      } = options || {};

      this.contentURL = contentURL || 'about:blank';
      if (contentScriptWhen)
        this.contentScriptWhen = contentScriptWhen;
      if (contentScriptURL)
        this.contentScriptURL = contentScriptURL;
      if (contentScript)
        this.contentScript = contentScript;
      if (allow)
        this.allow = allow;
      if (onError)
        this.on('error', onError);
      if (onMessage)
        this.on('message', onMessage);
      if (onReady)
        this.on('ready', onReady);

      this.on('propertyChange', this._onChange.bind(this));
      PageRegistry.on('add', this._onRegister.bind(this));
      PageRegistry.on('remove', this._onUnregister.bind(this));
    },
    postMessage: function postMessage() {
      if (!PageRegistry.has(this))
        throw new Error(ERR_ADD_BEFORE_POST);
    },
    _onChange: function _onChange(e) {
      if ('contentURL' in e)
        this._initFrame(this._frame);
    },
    _onInit: function _onInit() {
      this._onInitSymbiont();
      this._emit('ready', this._public);
    },
    _onRegister: function _onRegister(page) {
      if (page == this._public)
        this._initSymbiont();
    },
    _onUnregister: function _onUnregister(page) {
      if (page == this._public)
        this._destructor();
    }
  }
);
exports.Page = function(options) Page(options);
exports.Page.prototype = Page.prototype;

const PageRegistry = Registry(Page);
exports.add = PageRegistry.add;
exports.remove = PageRegistry.remove;

