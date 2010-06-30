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
 *   Zbigniew Braniecki <gandalf@mozilla.com> (Original author)
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

let xhr = require('xhr');
let timer = require("timer");
let prefs = require("preferences-service");
let file = require("file");
let {Cc, Ci} = require("chrome");

/**
 * An interface jetpack localization capabilities
 *
 * The primary method exposed by this interface is |get| which
 * should be provided with each string used in the jetpack
 * and returns the string itself or its localization if available.
 *
 * @version 0.1
 */

// common pool service object
let locale = prefs.get("general.useragent.locale", "en-US");
let programID = require('self').id;
// check if update is over one day old
const STORAGE_UPDATE_INTERVAL = 86400;
// update memory twice per day
const MEMORY_UPDATE_INTERVAL = 43200;

/**
 * Returns translation of a string if one is available,
 * otherwise returns the string itself
 *
 * @param   k
 *          The string to be localized
 *
 * @returns localized or source string
 */
exports.get = function (k) {
  let pool = cps.pool;
  // testing if we have this entity
  // for this locale in the pool
  if (pool !== null && k in cps.pool && locale in cps.pool[k]) {
    let entity = cps.pool[k][locale];
    // testing if we have a per-app exception
    // for this entity/locale pair
    if ("apps" in entity &&
        programID in entity["apps"])
      return entity["apps"][programID]["translation"];
    return entity["translation"];
  }
  return k;
}

let cps = {
  pool: null,
  last_update: null,
  I: null,
  url: "http://l10n.mozillalabs.com/",
  /**
   * Executes triggered request for updating
   * memory object from local storage
   */
  updateMemory: function() {
    let path = getStoragePath();
    // update storage if the file
    // does not exist or is older than we want
    if (!file.exists(path) ||
        (getUnixTimeStamp()-
         getLastModificationTime(path)/1000>=STORAGE_UPDATE_INTERVAL)) {
      console.debug('Updating storage!');
      cps.updateStorage();
      return;
    }
    console.debug('Not updating storage!');
    let str = file.read(path);
    cps.pool = JSON.parse(str);
    cps.last_update = getUnixTimeStamp();
  },
  /**
   * Executes triggered request for updating
   * local storage from remote server
   */
  updateStorage: function() {
    if (cps.url === undefined) {
      console.debug('Cannot update the storage due to lack of server!');
      return;
    }
    let req = new xhr.XMLHttpRequest();
    req.overrideMimeType("text/plain");
    req.open("GET", cps.url+'?locale='+locale+'&jid='+programID, true);
    req.onreadystatechange = function() {
      if (req.readyState == 4) {
        try {
          var obj = JSON.parse(req.responseText);
        } catch (e) {
          console.debug('Bad JSON!');
          return;
        }
        cps.pool = obj;
        cps.last_update = getUnixTimeStamp();
        let path = getStoragePath();
        let l10n_cp = file.open(path, 'w');
        l10n_cp.write(req.responseText);
        l10n_cp.close();
      }
    }
    req.send(null);
  }
};

if (cps.pool === null && cps.url !== null)
  cps.updateMemory();

cps.I = timer.setInterval(cps.updateMemory,
              MEMORY_UPDATE_INTERVAL*1000);

/**
 * Creates and returns a path to common pool json file
 *
 * @returns string with a path
 */
function getStoragePath() {
  let fh = Cc["@mozilla.org/file/directory_service;1"].
           getService(Ci.nsIProperties).
           get("ProfD", Ci.nsIFile);
  fh.append("jetpack");
  fh.append(programID);
  fh.append("localization");
  file.mkpath(fh.path);
  fh.append("l10n_cp.json");
  return fh.path;
}

/**
 * Returns last modification time for a file
 *
 * @returns integer with time in *milliseconds*
 */
function getLastModificationTime(path) {
  let file = Cc['@mozilla.org/file/local;1'].
             createInstance(Ci.nsILocalFile);
  file.initWithPath(path);
  return file.lastModifiedTime;
}

/**
 * Returns a unix timestamp
 *
 * @returns integer with a unix timestamp
 */
function getUnixTimeStamp() {
  return parseInt(new Date().getTime().toString().substring(0,10));
}
