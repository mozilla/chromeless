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
 *   Felipe Gomes <felipc@gmail.com> (Original Author)
 *   Myk Melez <myk@mozilla.org>
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

const apiUtils = require("api-utils");
const collection = require("collection");
const errors = require("errors");
const frames = require("hidden-frame");
const contentSymbionts = require("content-symbiont");

if (!require("xul-app").isOneOf(["Firefox", "Thunderbird"])) {
  throw new Error([
    "The page-worker module currently supports only Firefox and Thunderbird. ",
    "In the future, we would like it to support other applications, however. ",
    "Please see https://bugzilla.mozilla.org/show_bug.cgi?id=546740 for more ",
    "information."
  ].join(""));
}

exports.Page = apiUtils.publicConstructor(Page);

/**
 * A cache of active pages.  Each entry contains two properties, page and frame,
 * which represent the page and its underlying hidden frame, respectively.
 */
let cache = [];

function getFrame(page) {
  let entry = cache.filter(function (v) v.page === page)[0];
  return entry ? entry.frame : undefined;
}

function coerceToURL(content) {
  if (!content)
    return "about:blank";

  try {
    url.URL(content);
  }
  catch(ex) {
    content = "data:text/html," + content;
  }

  return content;
}

function Page(options) {
  options = options || {};
  let self = this;

  contentSymbionts.mixInto(this, options);

  // We define this independently of the main validateOptions call so we can
  // reuse it when checking values passed to the setter after construction.
  let contentReq = {
    is: ["undefined", "string"],
    msg: "The content option must be a string of HTML or a URL."
  };

  // Validate page-specific options without filtering those validated by
  // contentSymbionts.mixInto.
  for each (let [key, val] in Iterator(apiUtils.validateOptions(options,
                              { content: contentReq }))) {
    if (typeof(val) != "undefined")
      options[key] = val;
  };

  /* Public API: page.content */
  this.__defineGetter__("content", function () options.content || undefined);
  this.__defineSetter__("content", function (newValue) {
    options.content = apiUtils.validateOptions({ content: newValue },
                                               { content: contentReq }).
                      content;
    let frame = getFrame(self);
    if (frame)
      frame.element.setAttribute("src", coerceToURL(newValue));
  });

  /* Public API: page.allow */
  options.allow = options.allow || {};
  this.__defineGetter__("allow", function () {
    return {
      get script() {
        if ("allow" in options && "script" in options.allow)
          return options.allow.script;
        return true;
      },
      set script(newValue) {
        options.allow.script = !!newValue;
        let frame = getFrame(self);
        if (frame)
          frame.element.docShell.allowJavascript = !!newValue;
      }
    }
  });
  this.__defineSetter__("allow", function (newValue) {
    if ("script" in newValue)
      self.allow.script = !!newValue.script;
  });

  /* Public API: page.sendMessage() */
  this.sendMessage = function sendMessage(message, callback) {
    let frame = getFrame(self);
    if (frame)
      return frame.sendMessage(message, callback);
    else
      throw new Error("You have to add the page before you can send " +
                      "a message to it.");
  };

  this.toString = function toString() "[object Page]";
}

exports.add = function JP_SDK_Page_Worker_add(page) {
  if (!(page instanceof Page))
    throw new Error("The object to be added must be a Page Worker instance.");

  let frame = frames.add(frames.HiddenFrame({
    onReady: function() {
      this.element.docShell.allowJavascript = page.allow.script;
      this.element.setAttribute("src", coerceToURL(page.content));

      // The object that runs content scripts provided by the consumer
      // in the context of the content loaded in the page worker.
      contentSymbionts.ContentSymbiont({
        // this.element is a reference to the actual <xul:iframe> DOM element.
        frame: this.element,
        contentScriptURL: [c for (c in page.contentScriptURL)],
        contentScript: [c for (c in page.contentScript)],
        contentScriptWhen: page.contentScriptWhen,
        onMessage: function onMessage(message, cb) {
          for (let handler in page.onMessage) {
            errors.catchAndLog(function () handler.call(page, message, cb))();
          }
        },
        globalName: "pageWorker"
      });
    }
  }));

  cache.push({ page: page, frame: frame });

  return page;
}

exports.remove = function remove(page) {
  if (!(page instanceof Page))
    throw new Error("The object to be removed must be a PageWorker.");

  let entry = cache.filter(function (v) v.page === page)[0];
  if (!entry)
    return;

  frames.remove(entry.frame);
  cache.splice(cache.indexOf(entry), 1);
}

require("unload").when(function () {
  for each (let entry in cache.slice())
    exports.remove(entry.page);
});

