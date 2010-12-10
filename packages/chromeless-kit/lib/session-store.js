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
 *   Marcio Galli <mgalli@mgalli.com>
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

const {Cc, Ci, Cu} = require("chrome");

let gSession = { 
 
  _sessionFile: null, 
 
  localData: new Array(), 
 
  initSessionFile: function is() { 
    var dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
    this._sessionFile = dirService.get("ProfD", Ci.nsILocalFile);
    this._sessionFileBackup = this._sessionFile.clone();
    this._sessionFile.append("sessionstore.js");
    this._sessionFileBackup.append("sessionstore.bak");
  },
  addData: function aw(someData) { 
     this.localData.push(someData);
  }, 
  // Based on sss_saveState 
  // http://mxr.mozilla.org/mozilla-central/source/browser/components/sessionstore/src/nsSessionStore.js
  saveState: function ss() { 
    // we acquire some session stuff here 
    // we will eventually loop through browsers 

    var stateString = Cc["@mozilla.org/supports-string;1"].
                        createInstance(Ci.nsISupportsString);
    //stateString.data = "(" + this._toJSONString(aStateObj) + ")";
    // don't touch the file if an observer has deleted all state data

    stateString.data = this.localData[0];

    console.log("Will write data = "+stateString.data);
    console.log("Check your user profile for a sessionstore.js file");
    if (stateString.data)
      this._writeToDisk(this._sessionFile, stateString.data);

  },
 
  _writeToDisk: function writeToDisk(aFile, aData) { 
    var foStream = Cc["@mozilla.org/network/file-output-stream;1"].
                         createInstance(Ci.nsIFileOutputStream);
    foStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0); 
    var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
    converter.init(foStream, "UTF-8", 0, 0);
    converter.writeString(aData);
    converter.close(); // this closes foStream
  } ,
  _toJSONString: function sss_toJSONString(aJSObject) {
    let jsonString = JSON.stringify(aJSObject);
    if (/[\u2028\u2029]/.test(jsonString)) {
      jsonString = jsonString.replace(/[\u2028\u2029]/g, function($0) "\\u" + $0.charCodeAt(0).toString(16));
    }
    return jsonString;
  }
} 

exports.init = function init() {
	gSession.initSessionFile();
}

exports.add = function add(data) { 
 	gSession.addData(data);
}  

exports.save = function save() { 
	gSession.saveState();
} 

