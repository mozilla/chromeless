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

const {Cc,Ci,Cr} = require("chrome");

var mainWin = require("window-utils");

exports.fullscreen = function flipFullScreen() {
   mainWin.activeWindow.fullScreen=!mainWin.activeWindow.fullScreen;
}

exports.fixupuri = function fixUpURI(url) { 
   return Cc["@mozilla.org/docshell/urifixup;1"].getService(Ci.nsIURIFixup).createFixupURI(url,0).spec;;
} 

exports.setDragData = function setDragData(e,file,fileName) { 
   
   var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
   var URL = ios.newFileURI(file).spec;

   e.dataTransfer.setData("text/x-moz-url", URL);
   e.dataTransfer.setData("application/x-moz-file-promise-url", URL);
   e.dataTransfer.setData("application/x-moz-file-promise-filename", fileName);
   e.dataTransfer.mozSetDataAt('application/x-moz-file-promise', new dataProvider(), 0, Ci.nsISupports);
   //e.dataTransfer.setData('application/x-moz-file-promise', new dataProvider(), 0, Ci.nsISupports);
   //e.dataTransfer.mozSetDataAt("application/x-moz-file-promise", null, 0);
   e.dataTransfer.effectAllowed="copyMove";

} 

function dataProvider(){}

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

           } catch (e) {
              console.log("Error====="+e);
           }
        }
    }
}

