/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* vim:set ts=4 sw=4 sts=4 et: */
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
 * The Initial Developer of the Original Code is
 * Mike de Boer, Ajax.org.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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

const {Cc, Ci}       = require("chrome"),
      {Stream}       = require("net"),
      {EventEmitter} = require("events"),
      processes      = {};
      
let GUID = 0;

exports.spawn = function(command, args, options) {
    return new ChildProcess(command, args, options);
}

function ChildProcess(command, args, options) {
    let guid = ++GUID
    let child = processes[guid] = {
        __proto__: ChildProcess.prototype,
        _guid: guid
    };
    this.stdin  = new Stream();
    this.stdout = new Stream();
    this.stderr = new Stream();
    
    // create an nsILocalFile for the executable
    var file = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
    file.initWithPath(command);
    
    // create an nsIProcess
    this._process = Cc["@mozilla.org/process/util;1"]
                  .createInstance(Ci.nsIProcess);
    this._process.init(file);
    
    // Run the process.
    // If first param is true, calling thread will be blocked until
    // called process terminates.
    var _self = this;
    var termObserver = {
        observe: function terminationObserved(subject, topic, data) {
            _self._emit("exit", (topic === "process-finished") ? 0 : -1);
        }
    };
    this._process.runAsync(args, args.length, termObserver);

    return child;
}

ChildProcess.prototype = {
    __proto__: EventEmitter.prototype,
    constructor: ChildProcess,
    
    /**
     * Stops the server from accepting new connections. This function is
     * asynchronous, the server is finally closed when the server emits a
     * 'close' event.
     */
    destroy: function() {
        this.stdin.destroy();
        this.stdout.destroy();
        this.stderr.destroy();
        this._removeAllListeners("exit")
        delete servers[this._guid]
    }
};

require("unload").when(function unload() {
    for each(let process in processes) process.destroy()
})
