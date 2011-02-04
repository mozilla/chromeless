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

/**
 * Tools for enhancing drag and drop session. It makes possible to associate 
 * a file with an existing drag session, and to write a file to the disk
 * when the drop happens in the OS folder. 
 */

const {Cc,Ci,Cr} = require("chrome");

function MozFile(path) {
  var file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
  file.initWithPath(path);
  return file;
}

/**
 * Given an existing drag event, associates a system file, a mode of 
 * operation ( not yet implemented, default is to write a new file ), 
 * and developer's callback for success or error ( when the drag fails .)
 * @param {event} currentEvent the existing drag session event. 
 * @param {string} fullPath is a native path to the file.
 * @param {string} leafName is the string name to be given to the copy of the file.
 * @param {string} mode is string that indicates what operation to perform. Only "write" is supported and this parameter is not yet checked. 
 * @param {function} callback for success. 
 * @param {function} callback for error. 
 */

exports.setDragData = function setDragData(currentEvent,fullPath,leafName,mode,success,error) { 
   // mode is = copy..  see dataProvider 
   var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
   var URL = ios.newFileURI(MozFile(fullPath)).spec;

   currentEvent.dataTransfer.setData("text/x-moz-url", URL);
   currentEvent.dataTransfer.setData("application/x-moz-file-promise-url", URL);
   currentEvent.dataTransfer.setData("application/x-moz-file-promise-filename", leafName);
   currentEvent.dataTransfer.mozSetDataAt('application/x-moz-file-promise', new dataProvider(success,error), 0, Ci.nsISupports);
   currentEvent.dataTransfer.effectAllowed="copyMove";

} 

function dataProvider(successCallback, errorCallback){
   this.successCallback=successCallback;
   this.errorCallback=errorCallback;
}

dataProvider.prototype = {
    QueryInterface : function(iid) {
        if (iid.equals(Ci.nsIFlavorDataProvider) || iid.equals(Ci.nsISupports))
            return this;
        throw Cr.NS_NOINTERFACE;
    },
    getFlavorData : function(aTransferable, aFlavor, aData, aDataLen) {
        if (aFlavor == 'application/x-moz-file-promise') {
           var urlPrimitive = {};
           var dataSize = {};
           try {
                aTransferable.getTransferData('application/x-moz-file-promise-url', urlPrimitive, dataSize);
                var url = new String(urlPrimitive.value.QueryInterface(Ci.nsISupportsString));
console.log("URL file orignal is = "+url);
                var namePrimitive = {};
 		aTransferable.getTransferData('application/x-moz-file-promise-filename', namePrimitive, dataSize);
                var name = new String(namePrimitive.value.QueryInterface(Ci.nsISupportsString));
                 
console.log("target filename is = "+name);

                var dirPrimitive = {};
                aTransferable.getTransferData('application/x-moz-file-promise-dir', dirPrimitive, dataSize);
                var dir = dirPrimitive.value.QueryInterface(Ci.nsILocalFile);

console.log("target folder is = "+dir.path);

                var file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
                file.initWithPath(dir.path);
		file.appendRelativePath(name);

console.log("output final path is ="+file.path);

                var ioService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
                var urlURI = ioService.newURI(url, null, null);
                var fileURI = ioService.newFileURI(file);

		var file = urlURI.QueryInterface(Ci.nsIFileURL).file;
		file.copyTo(dir,null);
                this.successCallback();

           } catch (e) {
                console.log("Error====="+e);
                this.errorCallback(e);
           }
        }
    }
}

