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

/**
 * An extremely simple persistent key/value store.
 *
 *  Introduction
 * ------------
 *
 * The simple storage module exports an object called `storage` that is persistent
 * and private to your application.  It's a normal JavaScript object, and you can treat
 * it as you would any other.
 *
 * To store a value, just assign it to a property on `storage`:
 *
 *     var ss = require("simple-storage");
 *     ss.storage.myArray = [1, 1, 2, 3, 5, 8, 13];
 *     ss.storage.myBoolean = true;
 *     ss.storage.myNull = null;
 *     ss.storage.myNumber = 3.1337;
 *     ss.storage.myObject = { a: "foo", b: { c: true }, d: null };
 *     ss.storage.myString = "O frabjous day!";
 *
 * You can store array, boolean, number, object, null, and string values.  If you'd
 * like to store other types of values, you'll first have to convert them to
 * strings or another one of these types.
 *
 * Be careful to set properties on the `storage` object and not the module itself:
 *
 *     // This is no good!
 *     var ss = require("simple-storage");
 *     ss.foo = "I will not be saved! :(";
 *
 * Quotas
 * ------
 *
 * The simple storage available to your application is limited.  Currently this limit is
 * about five megabytes (5,242,880 bytes).  You can choose to be notified when you
 * go over quota, and you should respond by reducing the amount of data in storage.
 * If the user quits the application while you are over quota, all data stored
 * since the last time you were under quota will not be persisted.  You should not
 * let that happen.
 *
 * To listen for quota notifications, register a listener for the `"OverQuota"`
 * event.  It will be called when your storage goes over quota.
 *
 *     function myOnOverQuotaListener() {
 *       console.log("Uh oh.");
 *     }
 *     ss.on("OverQuota", myOnOverQuotaListener);
 *
 * Listeners can also be removed:
 *
 *     ss.removeListener("OverQuota", myOnOverQuotaListener);
 *
 * To find out how much of your quota you're using, check the module's `quotaUsage`
 * property.  It indicates the percentage of quota your storage occupies.  If
 * you're within your quota, it's a number from 0 to 1, inclusive, and if you're
 * over, it's a number greater than 1.
 *
 * Therefore, when you're notified that you're over quota, respond by removing
 * storage until your `quotaUsage` is less than or equal to 1.  Which particular
 * data you remove is up to you.  For example:
 *
 *     ss.storage.myList = [
 *       // some long array
 *     ];
 *     ss.on("OverQuota", function () {
 *       while (ss.quotaUsage > 1)
 *         ss.storage.myList.pop();
 *     });
 *
 * TODOS
 * -----
 *
 * Simple storage is *not*.  For the purposes of chromeless we should remove
 * this quota and perhaps make it write through, or at least expose a sync()
 * method.
 */

const {Cc,Ci} = require("chrome");
const file = require("file");
const fs = require("fs");
const path = require("path");
const prefs = require("preferences-service");
const jpSelf = require("self");
const timer = require("timer");
const unload = require("unload");
const { EventEmitter } = require("events");
const { Trait } = require("traits");

const WRITE_PERIOD_PREF = "extensions.addon-sdk.simple-storage.writePeriod";
const WRITE_PERIOD_DEFAULT = 300000; // 5 minutes

const QUOTA_PREF = "extensions.addon-sdk.simple-storage.quota";
const QUOTA_DEFAULT = 5242880; // 5 MiB

const JETPACK_DIR_BASENAME = "jetpack";


// simpleStorage.storage


/**
 * @property {object} storage
 * A special property which may be read or write and is backed
 * by a (JSON formatted) disk file for persistence.
 */
exports.__defineGetter__("storage", function () manager.root);
exports.__defineSetter__("storage", function (val) manager.root = val);

// simpleStorage.quotaUsage
/**
 * @property {XXX} quotaUsage
 * (read-only) Returns the amount of the quota used by this store
 */
exports.__defineGetter__("quotaUsage", function () manager.quotaUsage);

// A generic JSON store backed by a file on disk.  This should be isolated
// enough to move to its own module if need be...
function JsonStore(options) {
  this.filename = options.filename;
  this.quota = options.quota;
  this.writePeriod = options.writePeriod;
  this.onOverQuota = options.onOverQuota;
  this.onWrite = options.onWrite;

  unload.ensure(this);

  this.writeTimer = timer.setInterval(this.write.bind(this),
                                      this.writePeriod);
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
      fs.remove(this.filename);
      let parentPath = this.filename;
      do {
        parentPath = path.dirname(parentPath);
        // This'll throw if the dir isn't empty.
        fs.rmdir(parentPath);
      } while (path.basename(parentPath) !== JETPACK_DIR_BASENAME);
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
    if (this.quotaUsage > 1)
      this.onOverQuota(this);
    else
      this._write();
  },

  // Cleans up on unload.  If unloading because of uninstall, the store is
  // purged; otherwise it's written.
  unload: function JsonStore_unload(reason) {
    timer.clearInterval(this.writeTimer);
    this.writeTimer = null;

    if (reason === "uninstall")
      this.purge();
    else
      this._write();
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

  // Writes the root to the backing file, notifying write observers when
  // complete.  If the store is over quota or if it's empty and the store has
  // never been written, nothing is written and write observers aren't notified.
  _write: function JsonStore__write() {
    // If the store is empty and the file doesn't yet exist, don't write.
    if (this._isEmpty && !fs.exists(this.filename))
      return;

    // If the store is over quota, don't write.  The current under-quota state
    // should persist.
    if (this.quotaUsage > 1)
      return;

    // Finally, write.
    let stream = file.open(this.filename, "w");
    try {
      stream.writeAsync(JSON.stringify(this.root), function writeAsync(err) {
        if (err)
          console.error("Error writing simple storage file: " + this.filename);
        else if (this.onWrite)
          this.onWrite(this);
      }.bind(this));
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
let manager = Trait.compose(EventEmitter, Trait.compose({
  jsonStore: null,

  // The filename of the store, based on the profile dir and extension ID.
  get filename() {
    let storeFile = Cc["@mozilla.org/file/directory_service;1"].
                    getService(Ci.nsIProperties).
                    get("ProfD", Ci.nsIFile);
    storeFile.append(JETPACK_DIR_BASENAME);
    storeFile.append(jpSelf.id);
    storeFile.append("simple-storage");
    fs.mkpath(storeFile.path);
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

  unload: function manager_unload() {
    this._removeAllListeners("OverQuota");
    this._removeAllListeners("error");
  },

  constructor: function manager_constructor() {
    // Log unhandled errors.
    this.on("error", console.exception.bind(console));
    unload.ensure(this);

    this.jsonStore = new JsonStore({
      filename: this.filename,
      writePeriod: prefs.get(WRITE_PERIOD_PREF, WRITE_PERIOD_DEFAULT),
      quota: prefs.get(QUOTA_PREF, QUOTA_DEFAULT),
      onOverQuota: this._emitOnObject.bind(this, exports, "OverQuota")
    });
  }
}))();

/**
 * @function
 * set a listener to be notified on interesting, events like when you're
 * over quota.
 * @param {string} event
 * The name of the event to listen for, the only supported event is
 * `OverQuota`.
 * @param {function} listener
 * a function to be invoked when the event fires.
 */
exports.on = manager.on;
/**
 * @function
 * remove a listener previously set via the `on` method.
 * @param {string} event
 * The name of the event to remove a listener for, the only supported event is
 * `OverQuota`.
 * @param {function} listener
 * a reference to the function that was previously set as a listener with `on`
 */
exports.removeListener = manager.removeListener;
