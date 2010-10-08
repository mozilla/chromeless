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
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
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

var errors = require("errors");

var gWindowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                     .getService(Ci.nsIWindowWatcher);

const { EventEmitter } = require('events'),
      { Trait } = require('traits');

/**
 * An iterator for XUL windows currently in the application.
 * 
 * @return A generator that yields XUL windows exposing the
 *         nsIDOMWindow interface.
 */
var windowIterator = exports.windowIterator = function windowIterator() {
  let winEnum = gWindowWatcher.getWindowEnumerator();
  while (winEnum.hasMoreElements())
    yield winEnum.getNext().QueryInterface(Ci.nsIDOMWindow);
};

var WindowTracker = exports.WindowTracker = function WindowTracker(delegate) {
  this.delegate = delegate;
  this._loadingWindows = [];
  for (window in windowIterator())
    this._regWindow(window);
  gWindowWatcher.registerNotification(this);
  require("unload").ensure(this);
};

WindowTracker.prototype = {
  _regLoadingWindow: function _regLoadingWindow(window) {
    this._loadingWindows.push(window);
    window.addEventListener("load", this, true);
  },

  _unregLoadingWindow: function _unregLoadingWindow(window) {
    var index = this._loadingWindows.indexOf(window);

    if (index != -1) {
      this._loadingWindows.splice(index, 1);
      window.removeEventListener("load", this, true);
    }
  },

  _regWindow: function _regWindow(window) {
    if (window.document.readyState == "complete") {
      this._unregLoadingWindow(window);
      this.delegate.onTrack(window);
    } else
      this._regLoadingWindow(window);
  },

  _unregWindow: function _unregWindow(window) {
    if (window.document.readyState == "complete")
      this.delegate.onUntrack(window);
    else
      this._unregLoadingWindow(window);
  },

  unload: function unload() {
    gWindowWatcher.unregisterNotification(this);
    for (window in windowIterator())
      this._unregWindow(window);
  },

  handleEvent: function handleEvent(event) {
    if (event.type == "load" && event.target) {
      var window = event.target.defaultView;
      if (window)
        this._regWindow(window);
    }
  },

  observe: function observe(subject, topic, data) {
    var window = subject.QueryInterface(Ci.nsIDOMWindow);
    if (topic == "domwindowopened")
      this._regWindow(window);
    else
      this._unregWindow(window);
  }
};

errors.catchAndLogProps(WindowTracker.prototype, ["handleEvent", "observe"]);

const WindowTrackerTrait = Trait.compose({
  _onTrack: Trait.required,
  _onUntrack: Trait.required,
  constructor: function WindowTrackerTrait() {
    new WindowTracker({
      onTrack: this._onTrack.bind(this),
      onUntrack: this._onUntrack.bind(this)
    });
  }
});
exports.WindowTrackerTrait = WindowTrackerTrait;

var gDocsToClose = [];

function onDocUnload(event) {
  var index = gDocsToClose.indexOf(event.target);
  if (index == -1)
    throw new Error("internal error: unloading document not found");
  var document = gDocsToClose.splice(index, 1)[0];
  // Just in case, let's remove the event listener too.
  document.defaultView.removeEventListener("unload", onDocUnload, false);
}

onDocUnload = require("errors").catchAndLog(onDocUnload);

exports.closeOnUnload = function closeOnUnload(window) {
  window.addEventListener("unload", onDocUnload, false);
  gDocsToClose.push(window.document);
};

exports.__defineGetter__("activeWindow", function() {
  return Cc["@mozilla.org/appshell/window-mediator;1"]
         .getService(Ci.nsIWindowMediator)
         .getMostRecentWindow(null);
});
exports.__defineSetter__("activeWindow", function(window) {
  try {
    window.focus();
  }
  catch (e) { }
});

exports.__defineGetter__("activeBrowserWindow", function() {
  return Cc["@mozilla.org/appshell/window-mediator;1"]
         .getService(Ci.nsIWindowMediator)
         .getMostRecentWindow("navigator:browser");
});


require("unload").when(
  function() {
    gDocsToClose.slice().forEach(
      function(doc) { doc.defaultView.close(); });
  });
