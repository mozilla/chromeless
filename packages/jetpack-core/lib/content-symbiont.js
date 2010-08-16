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
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Myk Melez <myk@mozilla.org> (Original Author)
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
const errors = require("errors");
const timer = require("timer");
const apiUtils = require("api-utils");
const collection = require("collection");
const url = require("url");
const file = require("file");
const observers = require("observer-service");

const JS_VERSION = "1.8";

exports.ContentSymbiont = apiUtils.publicConstructor(ContentSymbiont);

function ContentSymbiont(options) {
  let sandbox = new Cu.Sandbox(Cc["@mozilla.org/systemprincipal;1"].
                               createInstance(Ci.nsIPrincipal));
  let self = this;

  // Validate configuration options.  For the most part, mixInto does this
  // for us, since the options that callers mix into their APIs are the same
  // ones we accept.  But callers also have to provide us a globalName,
  // which they don't provide in their APIs, so we check that one ourselves.
  mixInto(this, options);
  options.globalName = apiUtils.validateOptions(
                         options,
                         {
                           globalName: {
                             is: ["string"],
                             // The value cannot be an empty string,
                             // since we name a property with it.
                             ok: function(v) v != ""
                           }
                         }
                       ).globalName;

  // Configure the sandbox when the global object is created.  Called when
  // the value of contentScriptWhen is "start".
  // Note: this should wait until the document element has also been created,
  // but there isn't currently a way to do that.  See bug 579764 for details.
  function onGlobalCreated(window) {
    if (window != self.frame.contentWindow)
      return;
    configureSandbox(sandbox, self);
  }

  // Configure the sandbox when the DOM is ready.  Called when the value
  // of contentScriptWhen is "ready".
  function onReady(event) {
    if (event.target != self.frame.contentDocument)
      return;
    configureSandbox(sandbox, self);
  }

  // Configure the sandbox at the appropriate time, which depends on the value
  // of contentScriptWhen.
  function load() {
    if ("contentScriptWhen" in self && self.contentScriptWhen == "ready")
      self.frame.addEventListener("DOMContentLoaded", onReady, true, true);
    else
      observers.add("content-document-global-created", onGlobalCreated);
  }

  function unload() {
    if ("contentScriptWhen" in self && self.contentScriptWhen == "ready")
      self.frame.removeEventListener("DOMContentLoaded", onReady, true);
    else
      observers.remove("content-document-global-created", onGlobalCreated);
  }
  require("unload").when(unload);

  /* Public API: contentSymbiont.frame */
  this.__defineGetter__("frame", function () options.frame);
  this.__defineSetter__("frame", function (newVal) {
    unload();
    options.frame = newVal;
    load();
  });

  /* Public API: contentSymbiont.globalName */
  this.__defineGetter__("globalName", function () options.globalName);

  load();

  this.toString = function toString() "[object ContentSymbiont]";
}

function configureSandbox(sandbox, symbiont) {
  let program = {};

  // XXX I think the principal should be symbiont.frame.contentWindow,
  // but script doesn't work correctly when I set it to that value.
  // Events don't get registered; even dump() fails.
  //
  // FIXME: figure out the problem and resolve it, so we can restrict
  // the sandbox to the same set of privileges the page has (plus any others
  // it gets to access through the object that created it).
  //
  // XXX when testing symbiont.frame.contentWindow, I found that setting
  // the principal to its symbiont.frame.contentWindow.wrappedJSObject resolved
  // some test leaks; that was before I started clearing the principal
  // of the sandbox on unload, though, so perhaps it is no longer a problem.

  /**
   * An interface for communicating with the object that created the script,
   * The name of which is specified by the globalName option.
   */
  sandbox[symbiont.globalName] = program;
  require("collection").addCollectionProperty(program, "onMessage");
  addSendMessageProperty(program, symbiont);

  /* Public API: contentSymbiont.sendMessage */
  addSendMessageProperty(symbiont, program);

  // Chain the global object for the sandbox to the global object for
  // the frame.  This supports JavaScript libraries like jQuery that depend
  // on the presence of certain properties in the global object, like window,
  // document, location, and navigator.
  sandbox.__proto__ = symbiont.frame.contentWindow.wrappedJSObject;

  // Alternate approach:
  // Define each individual global on which JavaScript libraries depend
  // in the global object of the sandbox.  This is hard to get right,
  // since it requires a priori knowledge of the libraries developers use,
  // and exceptions in those libraries aren't always reported.  It's also
  // brittle, prone to breaking when those libraries change.  But it might
  // make it easier to avoid namespace conflicts.
  // In my testing with jQuery, I found that the library needed window,
  // document, location, and navigator to avoid throwing exceptions, although
  // even with those globals defined, the library still doesn't work, so it
  // also needs something else about which it unfortunately does not complain.
  //sandbox.window = symbiont.frame.contentWindow.wrappedJSObject;
  //sandbox.document = symbiont.frame.contentDocument.wrappedJSObject;
  //sandbox.location = symbiont.frame.contentWindow.wrappedJSObject.location;
  //sandbox.navigator = symbiont.frame.contentWindow.wrappedJSObject.navigator;

  // The order of contentScriptURL and contentScript evaluation is
  // intentional, so programs can load libraries like jQuery from script URLs
  // and use them in scripts.
  for each (let contentScriptURL in symbiont.contentScriptURL) {
    let filename = url.toFilename(contentScriptURL);
    errors.catchAndLog(
      function () Cu.evalInSandbox(file.read(filename), sandbox, JS_VERSION,
                                   filename, 1)
    )();
  }
  for each (let contentScript in symbiont.contentScript) {
    errors.catchAndLog(
      function () Cu.evalInSandbox(contentScript, sandbox, JS_VERSION,
                                   '<string>', 1)
    )();
  }
}


function addSendMessageProperty(sender, recipient) {
  sender.sendMessage = function sendMessage(message, callback) {
    message = validateMessage(message);

    if (typeof(callback) != "undefined" && typeof(callback) != "function")
      throw new Error("The callback must be a function.");

    // E10S means the callback passed to the message recipient will be
    // different than the function provided by the sender, and the call
    // will be asynchronous, so we simulate that by passing a different
    // function that calls the original callback asynchronously.
    let wrapper;
    if (callback) {
      wrapper = function (msg) timer.setTimeout(
        errors.catchAndLog(function () callback.call(sender, msg)),
        0
      );
    }

    for each (let handler in recipient.onMessage) {
      // E10S means the call will be asynchronous, so we simulate that
      // by calling the handler asynchronously.
      timer.setTimeout(errors.catchAndLog(
        // Strangely, calling handler directly rather than through Object.call
        // sometimes resolves a bunch of leaks.  It's not clear why, though,
        // and setting |this| is important for security and API consistency.
        function () handler.call(recipient, message, wrapper)), 0);
    }
  }
}

/**
 * Ensure that the given message can be stringified to JSON, stringifying
 * and parsing it in the process and returning the result so callers
 * can send a copy of the message to message recipients (simulating the way
 * recipients will receive a copy once E10S support means that these
 * messages cross process boundaries).
 */
function validateMessage(message) {
  try {
    return JSON.parse(JSON.stringify(message));
  }
  catch(ex) {
    throw new Error("The message must be a JSON-stringifiable value.");
  }
}

function validateOptions(options) {
  return apiUtils.validateOptions(options, {
    contentScriptURL: {
      is: ["array", "undefined"],
      map: function(v) {
        if (apiUtils.getTypeOf(v) === "string")
          v = [v];
        return v;
      },
      ok: function(v) {
        if (apiUtils.getTypeOf(v) === "array") {
          // Make sure every item is a local file URL.
          return v.every(function (item) {
            try {
              url.toFilename(item);
              return true;
            }
            catch(ex) {
              return false;
            }
          });
        }
        return true;
      },
      msg: "The contentScriptURL option must be a local file URL or an array " +
           "of URLs."
    },
    contentScript: {
      is: ["array", "undefined"],
      map: function(v) {
        if (apiUtils.getTypeOf(v) === "string")
          v = [v];
        return v;
      },
      ok: function(v) {
        if (apiUtils.getTypeOf(v) === "array") {
          // Make sure every item is a string.
          return v.every(function (item) apiUtils.getTypeOf(item) === "string")
        }
        return true;
      }
    },
    contentScriptWhen: {
      is: ["undefined", "string"],
      ok: function(v) v === undefined || v == "start" || v == "ready",
      msg: "The contentScriptWhen option must be either 'start' or 'ready'."
    },
    onMessage: {
      is: ["undefined", "function", "array"],
      ok: function(v) {
        if (apiUtils.getTypeOf(v) === "array") {
          // make sure every item is a function
          return v.every(function (item) typeof(item) === "function")
        }
        return true;
      }
    }
  });
}

let mixInto = exports.mixInto = function mixInto(object, options) {
  // Validate content-symbionts options without filtering those specific to
  // the caller.
  for each (let [key, val] in Iterator(validateOptions(options))) {
    if (typeof(val) != "undefined")
      options[key] = val;
  }

  /* Public API: contentSymbiont.contentScriptURL */
  collection.addCollectionProperty(object, "contentScriptURL");
  if (options.contentScriptURL)
    object.contentScriptURL.add(options.contentScriptURL);
  
  /* Public API: contentSymbiont.contentScript */
  collection.addCollectionProperty(object, "contentScript");
  if (options.contentScript)
    object.contentScript.add(options.contentScript);
  
  /* Public API: contentSymbiont.contentScriptWhen */
  object.__defineGetter__("contentScriptWhen",
                          function () options.contentScriptWhen || undefined);
  
  /* Public API: contentSymbiont.onMessage */
  collection.addCollectionProperty(object, "onMessage");
  if (options.onMessage)
    object.onMessage.add(options.onMessage);
}
