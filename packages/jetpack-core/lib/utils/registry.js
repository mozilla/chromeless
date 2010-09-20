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

const { EventEmitter } = require('events');
const unload = require("unload");

const Registry = EventEmitter.compose({
  _registry: null,
  _constructor: null,
  constructor: function Registry(constructor) {
    this._registry = [];
    this._constructor = constructor;
    this.on('error', this._onError = this._onError.bind(this));
    unload.when(this._destructor.bind(this));
  },
  _destructor: function _destructor() {
    let _registry = this._registry.slice(0);
    for each (instance in _registry)
      this._emit('remove', instance);
    this._registry.splice(0);
  },
  _onError: function _onError(e) {
    if (!this._listeners('error').length)
      console.error(e);
  },
  has: function has(instance) {
    let _registry = this._registry;
    return (
      (0 <= _registry.indexOf(instance)) ||
      (instance && instance._public && 0 <= _registry.indexOf(instance._public))
    );
  },
  add: function add(instance) {
    let { _constructor, _registry } = this; 
    if (!(instance instanceof _constructor))
      instance = new _constructor(instance);
    if (0 > _registry.indexOf(instance)) {
      _registry.push(instance);
      this._emit('add', instance);
      return instance;
    }
  },
  remove: function remove(instance) {
    let _registry = this._registry;
    let index = _registry.indexOf(instance)
    if (0 <= index) {
      this._emit('remove', instance);
      _registry.splice(index, 1);
    }
  }
});
exports.Registry = Registry;

