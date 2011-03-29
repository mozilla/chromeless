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

/**
 * spawn a child process.
 * @param command The command to execute
 * @param args Arguments to said command
 * @returns A ChildProcess
 */
exports.spawn = function(command, args) {
    var child = ChildProcess();
    child.run(command, args, options);
    return child;
}

function inspect(o) {
    var s = "";
    for (var i in o) {
        try {
            s += i + ": " + o[i] + "\n";
        }
        catch (ex) {
            s += "Cannot inspect property: " + i + "\n";
        }
    }
    console.log(s);
}

function ChildProcess() {
    let guid = ++ GUID
    return processes[guid] = {
        __proto__: ChildProcess.prototype,
        _guid: ++ guid
    }
}

/** @class ChildProcess */
ChildProcess.prototype = {
    __proto__: EventEmitter.prototype,
    constructor: ChildProcess,
    _process: null,
    stdin: null,
    stdout: null,
    stderr: null,

    /**
     * Asynchronously run a child process
     * @param command The command to execute
     * @param args Arguments to said command
     */
    run: function(command, args) {
        this.stdin  = Stream();
        this.stdout = Stream();
        this.stderr = Stream();

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
            observe: this.receiveSignal.bind(this)
        };
        this._process.runAsync(args, args.length, termObserver);
    },
    
    receiveSignal: function(subject, topic, data) {
        // @todo check with Irakli (@gozala) why _emit does not exist in this context
        //this._emit("exit", (topic === "process-finished") ? 0 : -1);
    },
    
    /**
     * Kill the child process and clean up resources.
     */
    destroy: function() {
        if (this._process) {
            this._process.kill();
            this._process = null;
        }
        this.stdin.destroy();
        this.stdout.destroy();
        this.stderr.destroy();
        this._removeAllListeners("exit")
        delete processes[this._guid];
    }
}

exports.ChildProcess = ChildProcess;
/** @endclass */

require("unload").when(function unload() {
    for each(let process in processes) process.destroy()
})
