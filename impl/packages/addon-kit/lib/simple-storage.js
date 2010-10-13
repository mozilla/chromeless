/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim:set ts=2 sw=2 sts=2 et filetype=javascript
 * ***** BEGIN LICENSE BLOCK *****
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
 *   Drew Willcoxon <adw@mozilla.com> (Original Author)
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
const file = require("file");
const prefs = require("preferences-service");
const jpSelf = require("self");
const timer = require("timer");
const unload = require("unload");

const WRITE_PERIOD_PREF = "jetpack.jetpack-core.simple-storage.writePeriod";
const WRITE_PERIOD_DEFAULT = 300000; // 5 minutes

const QUOTA_PREF = "jetpack.jetpack-core.simple-storage.quota";
const QUOTA_DEFAULT = 5242880; // 5 MiB


// simpleStorage.storage
exports.__defineGetter__("storage", function () manager.root);
exports.__defineSetter__("storage", function (val) manager.root = val);

// simpleStorage.quotaUsage
exports.__defineGetter__("quotaUsage", function () manager.quotaUsage);

// simpleStorage.onOverQuota
collection.addCollectionProperty(exports, "onOverQuota");


// A generic JSON store backed by a file on disk.  This should be isolated
// enough to move to its own module if need be...
function JsonStore(options) {
  this.filename = options.filename;
  this.quota = options.quota;
  this.writePeriod = options.writePeriod;
  this.onOverQuota = options.onOverQuota || new collection.Collection();
  this.onWrite = options.onWrite || new collection.Collection();
  this.observersThisArg = options.observersThisArg;

  unload.ensure(this);

  const self = this;
  this.writeTimer = timer.setInterval(function JsonStore_periodicWrite() {
    self.write();
  }, this.writePeriod);
}

JsonStore.prototype = {

  // The store's root.
  get root() {
    return this._root === undefined ? {} : this._root;
  },

  // Performs some type checking.
  set root(val) {
    let types = ["array", "boolean", "null", "number", "object", "string"];
    if (types.indexOf(typeof(val)) < 0) {
      throw new Error("storage must be one of the following types: " +
                      types.join(", "));
    }
    this._root = val;
    return val;
  },

  // Percentage of quota used, as a number [0, Inf).  > 1 implies over quota.
  // Undefined if there is no quota.
  get quotaUsage() {
    return this.quota > 0 ?
           JSON.stringify(this.root).length / this.quota :
           undefined;
  },

  // Removes the backing file and all empty subdirectories.
  purge: function JsonStore_purge() {
    try {
      // This'll throw if the file doesn't exist.
      file.remove(this.filename);
      let parentPath = this.filename;
      while (true) {
        parentPath = file.dirname(parentPath);
        // This'll throw if the dir isn't empty.
        file.rmdir(parentPath);
      }
    }
    catch (err) {}
  },

  // Initializes the root by reading the backing file.
  read: function JsonStore_read() {
    try {
      let str = file.read(this.filename);

      // Ideally we'd log the parse error with console.error(), but logged
      // errors cause tests to fail.  Supporting "known" errors in the test
      // harness appears to be non-trivial.  Maybe later.
      this.root = JSON.parse(str);
    }
    catch (err) {
      this.root = {};
    }
  },

  // If the store is under quota, writes the root to the backing file.
  // Otherwise quota observers are notified and nothing is written.
  write: function JsonStore_write() {
    if (this.quotaUsage > 1) {
      let arr = this._copyAndWrapObservers(this.onOverQuota);
      this._notifyObserversArray(arr);
    }
    else
      this._write();
  },

  // Cleans up on unload.  If unloading because of uninstall, the store is
  // purged; otherwise it's written.
  unload: function JsonStore_unload(reason) {
    timer.clearInterval(this.writeTimer);

    if (reason === "uninstall")
      this.purge();
    else
      this._write();

    // Clear the collections so they don't keep references to client callbacks.
    this.onOverQuota = [];
    this.onWrite = [];
  },

  // True if the root is an empty object.
  get _isEmpty() {
    if (this.root && typeof(this.root) === "object") {
      let empty = true;
      for (let key in this.root) {
        empty = false;
        break;
      }
      return empty;
    }
    return false;
  },

  // Returns the given observers collection as an array, with each function
  // wrapped in a try-catch-log function.  This has the important side effect of
  // allowing the collection to be subsequently freed.
  _copyAndWrapObservers: function JsonStore__copyAndWrapObservers(observers) {
    let arr = [];
    for (let obs in observers)
      arr.push(require("errors").catchAndLog(obs));
    return arr;
  },

  // Calls all observer functions in the given array.
  _notifyObserversArray: function JsonStore__notifyObserversArray(obsArray) {
    while (obsArray.length)
      obsArray.shift().call(this.observersThisArg);
  },

  // Writes the root to the backing file, notifying write observers when
  // complete.  If the store is over quota or if it's empty and the store has
  // never been written, nothing is written and write observers aren't notified.
  _write: function JsonStore__write() {
    // If the store is empty and the file doesn't yet exist, don't write.
    if (this._isEmpty && !file.exists(this.filename))
      return;

    // If the store is over quota, don't write.  The current under-quota state
    // should persist.
    if (this.quotaUsage > 1)
      return;

    // Before we leave this function, copy observers into an array, because
    // they're removed on unload.
    let obsArray = this._copyAndWrapObservers(this.onWrite);

    // Finally, write.
    const self = this;
    let stream = file.open(this.filename, "w");
    try {
      stream.writeAsync(JSON.stringify(this.root), function writeAsync(err) {
        if (err)
          console.error("Error writing simple storage file: " + self.filename);
        else
          self._notifyObserversArray(obsArray);
      });
    }
    catch (err) {
      // writeAsync closes the stream after it's done, so only close on error.
      stream.close();
    }
  }
};


// This manages a JsonStore singleton and tailors its use to simple storage.
// The root of the JsonStore is lazy-loaded:  The backing file is only read the
// first time the root's gotten.
let manager = {

  // The filename of the store, based on the profile dir and extension ID.
  get filename() {
    let storeFile = Cc["@mozilla.org/file/directory_service;1"].
                    getService(Ci.nsIProperties).
                    get("ProfD", Ci.nsIFile);
    storeFile.append("jetpack");
    storeFile.append(jpSelf.id);
    storeFile.append("simple-storage");
    file.mkpath(storeFile.path);
    storeFile.append("store.json");
    return storeFile.path;
  },

  get quotaUsage() {
    return this.jsonStore.quotaUsage;
  },

  get root() {
    if (!this.rootInited) {
      this.jsonStore.read();
      this.rootInited = true;
    }
    return this.jsonStore.root;
  },

  set root(val) {
    let rv = this.jsonStore.root = val;
    this.rootInited = true;
    return rv;
  },

  // Must be called before use.
  init: function manager_init() {
    let fname = this.filename;
    this.jsonStore = new JsonStore({
      filename: fname,
      writePeriod: prefs.get(WRITE_PERIOD_PREF, WRITE_PERIOD_DEFAULT),
      quota: prefs.get(QUOTA_PREF, QUOTA_DEFAULT),
      onOverQuota: exports.onOverQuota,
      observersThisArg: exports
    });
  }
};

manager.init();
