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
 *   Irakli Gozalishvili <gozala@mozilla.com> (Original Author)
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

const { EventEmitter } = require('events');
const { validateOptions, getTypeOf } = require('api-utils');
const { URL, toFilename } = require('url');
const file = require("file");

// map of property validations
const valid = {
  contentURL: {
    ok: function (value) {
      try {
        URL(value);
      }
      catch(e) {
        return false;
      }
      return true;
    },
    msg: 'The `contentURL` option must be a valid URL.'
  },
  contentScriptFile: {
    is: ['undefined', 'null', 'string', 'array'],
    map: function(value) 'undefined' === getTypeOf(value) ? null : value,
    ok: function(value) {
      if (getTypeOf(value) === 'array') {
        // Make sure every item is a local file URL.
        return value.every(function (item) {
          try {
            toFilename(item);
            return true;
          }
          catch(e) {
            return false;
          }
        });
      }
      return true;
    },
    msg: 'The `contentScriptFile` option must be a local file URL or an array of'
          + 'URLs.'
  },
  contentScript: {
    is: ['undefined', 'null', 'string', 'array'],
    map: function(value) 'undefined' === getTypeOf(value) ? null : value,
    ok: function(value) 'array' !== getTypeOf(value) ? true :
      value.every(function(item) 'string' === getTypeOf(item))
    ,
    msg: 'The script option must be a string or an array of strings.'
  },
  contentScriptWhen: {
    is: ['string'],
    ok: function(value) ['start', 'ready'].indexOf(value) >= 0,
    map: function(value) value || 'start',
    msg: 'The `contentScriptWhen` option must be either "start" or "ready".'
  }
};

/**
 * Shortcut function to validate property with validation.
 * @param {Object|Number|String} suspect
 *    value to validate
 * @param {Object} validation
 *    validation rule passed to `api-utils`
 */
function validate(suspect, validation) validateOptions(
  { $: suspect },
  { $: validation }
).$

function Allow(script) ({
  get script() script,
  set script(value) script = !!value
})

/**
 * Trait is intended to be used in some composition. It provides set of core
 * properties and bounded validations to them. Trait is useful for all the
 * compositions providing high level APIs for interaction with content.
 * Property changes emit `"propertyChange"` events on instances.
 */
const Loader = EventEmitter.compose({
  /**
   * Permissions for the content, with the following keys:
   * @property {Object} [allow = { script: true }]
   * @property {Boolean} [allow.script = true]
   *    Whether or not to execute script in the content.  Defaults to true.
   */
  get allow() this._allow || (this._allow = Allow(true)),
  set allow(value) this.allow.script = value && value.script,
  _allow: null,
  /**
   * The content to load. Either a string of HTML or a URL.
   * @type {String}
   */
  get contentURL() this._contentURL,
  set contentURL(value) {
    value = validate(value, valid.contentURL);
    if (this._contentURL != value) {
      this._emit('propertyChange', {
        contentURL: this._contentURL = value
      });
    }
  },
  _contentURL: null,
  /**
   * When to load the content scripts.
   * Possible values are "start" (default), which loads them as soon as
   * the window object for the page has been created, and "ready", which
   * loads them once the DOM content of the page has been loaded.
   * Property change emits `propertyChange` event on instance with this key
   * and new value.
   * @type {'start'|'ready'}
   */
  get contentScriptWhen() this._contentScriptWhen,
  set contentScriptWhen(value) {
    value = validate(value, valid.contentScriptWhen);
    if (value !== this._contentScriptWhen) {
      this._emit('propertyChange', { 
        contentScriptWhen: this._contentScriptWhen = value 
      });
    }
  },
  _contentScriptWhen: 'start',
  /**
   * The URLs of content scripts.
   * Property change emits `propertyChange` event on instance with this key
   * and new value.
   * @type {String[]}
   */
  get contentScriptFile() this._contentScriptFile,
  set contentScriptFile(value) {
    value = validate(value, valid.contentScriptFile);
    if (value != this._contentScriptFile) {
      this._emit('propertyChange', { 
        contentScriptFile: this._contentScriptFile = value
      });
    }
  },
  _contentScriptFile: null,
  /**
   * The texts of content script.
   * Property change emits `propertyChange` event on instance with this key
   * and new value.
   * @type {String|undefined}
   */
  get contentScript() this._contentScript,
  set contentScript(value) {
    value = validate(value, valid.contentScript);
    if (value != this._contentScript) {
      this._emit('propertyChange', {
        contentScript: this._contentScript = value 
      });
    }
  },
  _contentScript: null
});
exports.Loader = Loader;

