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
 * Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Paul O’Shannessy <paul@oshannessy.com>
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

const {Cc,Ci} = require("chrome");
const collection = require("collection");
const observers = require("observer-service");
const errors = require("errors");

let pbService;
// Currently, only Firefox implements the private browsing service.
if (require("xul-app").is("Firefox")) {
  pbService = Cc["@mozilla.org/privatebrowsing;1"].
              getService(Ci.nsIPrivateBrowsingService);
}

// make pb.active work
exports.__defineGetter__("active", function () {
  return pbService ? pbService.privateBrowsingEnabled : false;
});

exports.__defineSetter__("active", function (val) {
  if (pbService) {
    pbService.privateBrowsingEnabled = val;
  }
});

// add our collection properties
collection.addCollectionProperty(exports, "onBeforeStart");
collection.addCollectionProperty(exports, "onStart");
collection.addCollectionProperty(exports, "onAfterStart");
collection.addCollectionProperty(exports, "onBeforeStop");
collection.addCollectionProperty(exports, "onStop");
collection.addCollectionProperty(exports, "onAfterStop");

// implement functions to serve as delegators for various observer topics
function onBeforeTransition(subject, data) {
  subject.QueryInterface(Ci.nsISupportsPRBool);
  // If subject is already true (by way of another observer), exit early.
  if (subject.data)
    return;

  let callbacks = data == "enter" ? exports.onBeforeStart :
                  data == "exit"  ? exports.onBeforeStop  : [];

  for (let callback in callbacks) {
    let cancelled = false;
    // Since we're calling a user-defined callback, we need to catchAndLog it.
    errors.catchAndLog(function () {
      callback.call(exports, function () cancelled = true);
    })();

    // If cancel() was called, then we want to make sure the PB transition is
    // cancelled and also stop executing any other callbacks we have.
    if (cancelled) {
      subject.data = true;
      break;
    }
  }
}

// We don't need to do anything with cancel here.
function onTransition(subject, data) {
  let callbacks = data == "enter" ? exports.onStart :
                  data == "exit"  ? exports.onStop  : [];
  for (let callback in callbacks) {
    errors.catchAndLog(function () {
      callback.call(exports);
    })();
  }
}

function onAfterTransition(subject, data) {
  // "private-browsing-transition-complete" isn't sent with "enter"/"exit", so
  // determine which it was based on if PB is active.
  let callbacks = exports.active ? exports.onAfterStart : exports.onAfterStop;
  for (let callback in callbacks) {
    errors.catchAndLog(function () {
      callback.call(exports);
    })();
  }
}

// We only need to add observers if pbService exists.
if (pbService) {
  observers.add("private-browsing-cancel-vote", onBeforeTransition);
  observers.add("private-browsing", onTransition);
  observers.add("private-browsing-transition-complete", onAfterTransition);
}

