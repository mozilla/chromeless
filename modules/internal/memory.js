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

const {Cc,Ci,Cu,components} = require("chrome");
var trackedObjects = {};

var Compacter = {
  INTERVAL: 5000,
  notify: function(timer) {
    var newTrackedObjects = {};
    for (name in trackedObjects) {
      var oldBin = trackedObjects[name];
      var newBin = [];
      var strongRefs = [];
      for (var i = 0; i < oldBin.length; i++) {
        var strongRef = oldBin[i].weakref.get();
        if (strongRef && strongRefs.indexOf(strongRef) == -1) {
          strongRefs.push(strongRef);
          newBin.push(oldBin[i]);
        }
      }
      if (newBin.length)
        newTrackedObjects[name] = newBin;
    }
    trackedObjects = newTrackedObjects;
  }
};

var timer = Cc["@mozilla.org/timer;1"]
            .createInstance(Ci.nsITimer);

timer.initWithCallback(Compacter,
                       Compacter.INTERVAL,
                       Ci.nsITimer.TYPE_REPEATING_SLACK);

var track = exports.track = function track(object, bin, stackFrameNumber) {
  var frame = components.stack.caller;
  var weakref = Cu.getWeakReference(object);
  if (!bin)
    bin = object.constructor.name;
  if (bin == "Object")
    bin = frame.name;
  if (!bin)
    bin = "generic";
  if (!(bin in trackedObjects))
    trackedObjects[bin] = [];

  if (stackFrameNumber > 0)
    for (var i = 0; i < stackFrameNumber; i++)
      frame = frame.caller;

  trackedObjects[bin].push({weakref: weakref,
                            created: new Date(),
                            filename: frame.filename,
                            lineNo: frame.lineNumber,
                            bin: bin});
};

var getBins = exports.getBins = function getBins() {
  var names = [];
  for (name in trackedObjects)
    names.push(name);
  return names;
};

var getObjects = exports.getObjects = function getObjects(bin) {
  function getLiveObjectsInBin(bin, array) {
    for (var i = 0; i < bin.length; i++) {
      var object = bin[i].weakref.get();
      if (object)
        array.push(bin[i]);
    }
  }

  var results = [];
  if (bin) {
    if (bin in trackedObjects)
      getLiveObjectsInBin(trackedObjects[bin], results);
  } else
    for (name in trackedObjects)
      getLiveObjectsInBin(trackedObjects[name], results);
  return results;
};

var gc = exports.gc = function gc() {
  // Components.utils.forceGC() doesn't currently perform
  // cycle collection, which means that e.g. DOM elements
  // won't be collected by it. Fortunately, there are
  // other ways...

  var window = Cc["@mozilla.org/appshell/appShellService;1"]
               .getService(Ci.nsIAppShellService)
               .hiddenDOMWindow;
  var test_utils = window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIDOMWindowUtils);
  test_utils.garbageCollect();
  Compacter.notify();

  // Not sure why, but sometimes it appears that we don't get
  // them all with just one CC, so let's do it again.
  test_utils.garbageCollect();
};

require("unload").when(
  function() {
    trackedObjects = {};
    if (timer) {
      timer.cancel();
      timer = null;
    }
  });
