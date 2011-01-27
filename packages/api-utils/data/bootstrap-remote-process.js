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

// This is the first code that's ever run in a Jetpack process. It sets up
// infrastructure and receivers needed to start a Jetpack-based addon
// in a separate process.

// A list of scripts to inject into all new CommonJS module sandboxes.
var injectedSandboxScripts = [];

// A table of all CommonJS modules currently loaded.
var modules = {};

// This object represents the chrome process, and can be used to
// communicate with it.
var chrome = {
  createHandle: function() {
    return createHandle();
  },
  on: function(type, listener) {
    registerReceiver(type, listener);
  },
  removeListener: function(type, listener) {
    unregisterReceiver(type, listener);
  },
  send: function(type) {
    sendMessage.apply(this, arguments);
  },
  call: function(name) {
    var result = callMessage.apply(this, arguments);

    if (result.length > 1)
      throw new Error("More than one result received for call '" + name +
                      "': " + result.length);

    if (result.length == 0)
      throw new Error("No receiver registered for call '" + name + "'");

    if (result[0].exception) {
      throw Object.create(Error.prototype, {
        message: { value: result[0].exception.message, enumerable: true },
        fileName: { value: result[0].exception.fileName, enumerable: true },
        lineNumber: { value: result[0].exception.lineNumber, enumerable: true },
        // Concatenate the stack from the other process with one from this
        // process, so callers have access to the full stack.
        stack: { value: result[0].exception.stack + (new Error()).stack,
                 enumerable: true }
      });
    }

    return result[0].returnValue;
  }
};

// Use this for really low-level debugging of this script.
function dump(msg) {
  // Don't use chrome.send() to avoid infinite recursion when
  // debugging chrome.send() itself.
  sendMessage("dump", msg);
}

// Taken from plain-text-console.js.
function stringify(arg) {
  try {
    return String(arg);
  }
  catch(ex) {
    return "<toString() error>";
  }
}

// Set up our "proxy" objects that just send messages to our parent
// process to do the real work.
var console = {
  exception: function(e) {
    chrome.send('console:exception', e);
  },
  trace: function() {
    chrome.send('console:trace', new Error());
  }
};

['log', 'debug', 'info', 'warn', 'error'].forEach(function(method) {
  console[method] = function() {
    chrome.send('console:' + method, Array.map(arguments, stringify));
  }
});

var memory = {
  track: function() {
    /* TODO */
  }
};

function makeRequire(base) {
  var resolvedNames = {};  

  function require(name) {
    // first, have we already require()d this name from this base? Just
    // re-use the module
    if (name && name in resolvedNames)
      return resolvedNames[name].exports;

    // if not, resolve relative import names by asking the browser-process
    // side for the URL/filename of the module this points to
    var response = chrome.call("require", base, name);
    switch (response.code) {
    case "not-found":
      throw new Error("Unknown module '" + name + "'.");
    case "access-denied":
      throw new Error("Module '" + name + "' requires chrome privileges " +
                      "and has no e10s adapter.");
    case "error":
      throw new Error("An unexpected error occurred in the chrome " +
                      "process.");
    case "ok":
      break;
    default:
      throw new Error("Internal error: unknown response code '" +
                      response.code + "'");
    };

    // do we already have a module for this filename?
    if (response.script.filename in modules) {
      module = resolvedNames[name] = modules[response.script.filename];
      return module.exports;
    }

    var module = createSandbox();

    function injectScript(script) {
      evalInSandbox(module, '//@line 1 "' + script.filename + 
                    '"\n' + script.contents);  
    }

    injectedSandboxScripts.forEach(injectScript);

    modules[response.script.filename] = resolvedNames[name] = module;
  
    // Set up the globals of the sandbox.
    module.exports = {};
    module.console = console;
    module.memory = memory;
    module.require = makeRequire(response.script.filename);
    module.__url__ = response.script.filename;
  
    if (response.needsMessaging)
      module.chrome = chrome;

    injectScript(response.script);

    return module.exports;
  };
  return require;
}

chrome.on(
  "addInjectedSandboxScript",
  function(name, script) {
    injectedSandboxScripts.push(script);
  });

chrome.on(
  "startMain",
  function(name, mainName, options) {
    var mainRequire = makeRequire(null);
    var main = mainRequire(mainName);

    var callbacks = {
      quit: function quit(status) {
        if (status === undefined)
          status = "OK";
        chrome.send("quit", status);
      }
    };

    if ('main' in main)
      main.main(options, callbacks);
  });
