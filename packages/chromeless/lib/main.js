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

// This is temporary, we are temporaily exposing this to the HTML
// developer browser, so we can continue to test the tabbrowser
// element and session store til we figure out and keep things things
// here in this main app context. Search for Ci, we current expose Ci
// to the developers HTML browser.

const {Ci, Cc, Cr, Cu} = require("chrome");
const path = require('path');
const appinfo = require('appinfo');

var appWindow = null; 

// These functions are used from the test application. 
/*
exports.getAppWindow = function () {
        return appWindow;
}
*/
exports.__defineGetter__('getAppWindow', function () { 
     return appWindow; 
} );

exports.getAppBrowser = function () {
        return appWindow._browser;
} 

function testFunction(html) {
  return html.replace("World", "Hello");
}

exports.testFunction = testFunction;


function enableDebuggingOutputToConsole() {
    var jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"]
              .getService(Ci.jsdIDebuggerService);

    jsd.errorHook = {
        onError: function(message, fileName, lineNo, colNo, flags, errnum, exc) {
            // check message type
            var jsdIErrorHook = Ci.jsdIErrorHook;
            var messageType;
            if (flags & jsdIErrorHook.REPORT_ERROR)
                messageType = "Error";
            if (flags & jsdIErrorHook.REPORT_WARNING)
                messageType = "Warning";
            if (flags & jsdIErrorHook.REPORT_EXCEPTION)
                messageType = "Uncaught-Exception";
            if (flags & jsdIErrorHook.REPORT_STRICT)
                messageType += "-Strict";

            // for now we decide NOT to show any other message than Error or Exception:
            if (flags & jsdIErrorHook.REPORT_ERROR || flags & jsdIErrorHook.REPORT_EXCEPTION)
                console.log(messageType + ": '" + message + "' in file '" + fileName + "' at line " + lineNo + ", col " + colNo + " (" + errnum + ")\n");

            //return false;   // trigger debugHook
            return true; //if you do not wish to trigger debugHook
        }
    };

    // note that debugHook does not _always_ trigger when jsd.errorHook[onError] returns false 
    // it is not well-known why debugHook sometimes fails to trigger 
    jsd.debugHook = {
        onExecute: function(frame, type, rv) {
            stackTrace = "";
            for (var f = frame; f; f = f.callingFrame) {
                stackTrace += "@ " + f.script.fileName + " at line " + f.line + " function " + f.functionName + "\n";
            }
            console.log(stackTrace);

            return Ci.jsdIExecutionHook.RETURN_CONTINUE;
        }
    };

    jsd.asyncOn(function() {
        console.log("debugger enabled");
    });
}


function requireForBrowser(moduleName) {
    console.log("browser HTML requires: " + moduleName);
    try {
  	    return require(moduleName);
    }
    catch(e) {
        console.log("require of '" + moduleName + "' failed: " + e);
        // re-throw to the developer to give them an opportunity to handle the error
        throw e;
    }
}

exports.main = function main(options, testCallbacks) {
    // access appinfo.json contents for startup parameters
    const ai = appinfo.contents;
    //console.log("appinfo.json contents: ", ai);
    
    /*if(options.appinfo) {
      console.log("appinfo: ", options.appinfo);
    }*/

    var call = options.staticArgs;
    const contentWindow = /*require("chromeless-sandbox-window1")*/require('windows');
    
    //console.log("options: ", options, "testCallbacks: ", testCallbacks);

    var file = path.basename(call.browser);

    var systemMode = appinfo.contents.enableSystemPrivileges ? true : false;

    if(systemMode) {
        var rootPath = path.join(call.appBasePath, path.dirname(call.browser));
        var startPage = require('url').fromFilename(call.appBasePath);
        var protocol = require("custom-protocol").register("chromeless");
        protocol.setHost("main", startPage , "system");
        var startPage = "chromeless://main/" + call.browser;
    } else {
       // convert browser url into a resource:// url
       // i.e. 'browser_code/index.html' is mapped to 'resource://app/index.html'
       var file = path.basename(call.browser);
       var rootPath = path.join(call.appBasePath, path.dirname(call.browser));
       var startPage = "resource://app/" + file;
   
       ios = Cc["@mozilla.org/network/io-service;1"]
                         .getService(Ci.nsIIOService),
       resProtocol = ios.getProtocolHandler("resource")
                         .QueryInterface(Ci.nsIResProtocolHandler),
   
       environment = Cc["@mozilla.org/process/environment;1"]
                         .getService(Ci.nsIEnvironment),
       resRoot = Cc["@mozilla.org/file/local;1"]
                         .createInstance(Ci.nsILocalFile),
   
       resRoot.initWithPath(rootPath);
   
       resProtocol.setSubstitution("app", ios.newFileURI(resRoot));
   
       // register chrome://* URIs
       let cr = Cc["@mozilla.org/chrome/chrome-registry;1"]
                .getService(Ci.nsIChromeRegistry);
       cr.checkForNewChrome();
    } 
    
    console.log("Loading browser using: " + startPage);

    // enable debugging by default
    enableDebuggingOutputToConsole();
    
    console.log("appinfo: ", ai);

    /* Page window height and width is fixed, it won't be and it also
       should be smart, so HTML browser developer can change it when
       they set inner document width and height */
    appWindow = new contentWindow.Window({
        url: startPage,
        width: 800,
        height: 600,
        resizable: (ai.resizable ? true : false),
        menubar: (ai.menubar ? ai.menubar : false),
        resizable: ai.resizable ? true : false,
        menubar: ai.menubar ? true : false,
        injectProps : {
            require: requireForBrowser,
            console: /*{
                log: function() {
                    console.log.apply(console, Array.prototype.slice.call(arguments));
                }
            }*/console,
            exit: function() {
                console.log("window.exit() called...");
                appWindow.close();
                appWindow = null; // this is for tests framework to test the window 
                // exists or not 
            }
        }
    }, testCallbacks);
    //console.log("appWindow: ", appWindow);
};

exports.onUnload = function (reason) {
    console.log("shutting down.");
    appWindow.close();
};
