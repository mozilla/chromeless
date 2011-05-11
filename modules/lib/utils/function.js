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

var { setTimeout } = require("timer");

/**
 * Takes a function and returns a wrapped one instead, calling which will call
 * original function in the next turn of event loop. This is basically utility
 * to do `setTimeout(function() { ... }, 0)`, with a difference that returned
 * function is reused, instead of creating a new one each time. This also allows
 * to use this functions as event listeners.
 */
function Enqueued(callee) {
  return function enqueued()
    setTimeout(invoke, 0, callee, arguments, this);
}
exports.Enqueued = Enqueued;

/**
 * Invokes `callee` by passing `params` as an arguments and `self` as `this`
 * pseudo-variable. Returns value that is returned by a callee.
 * @param {Function} callee
 *    Function to invoke.
 * @param {Array} params
 *    Arguments to invoke function with.
 * @param {Object} self
 *    Object to be passed as a `this` pseudo variable.
 */
function invoke(callee, params, self) callee.apply(self, params);
exports.invoke = invoke;
