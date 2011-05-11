/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim:set ts=2 sw=2 sts=2 et filetype=javascript
 * ***** BEGIN LICENSE BLOCK *****
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
 *   Drew Willcoxon <adw@mozilla.com> (Original Author)
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

const { Cc, Ci, Cr } = require("chrome");
const apiUtils = require("api-utils");
const errors = require("errors");

try {
  let alertServ = Cc["@mozilla.org/alerts-service;1"].
                  getService(Ci.nsIAlertsService);

  // The unit test sets this to a mock notification function.
  var notify = alertServ.showAlertNotification.bind(alertServ);
}
catch (err) {
  // An exception will be thrown if the platform doesn't provide an alert
  // service, e.g., if Growl is not installed on OS X.  In that case, use a
  // mock notification function that just logs to the console.
  notify = notifyUsingConsole;
}

exports.notify = function notifications_notify(options) {
  let valOpts = validateOptions(options);
  let clickObserver = !valOpts.onClick ? null : {
    observe: function notificationClickObserved(subject, topic, data) {
      if (topic === "alertclickcallback")
        errors.catchAndLog(valOpts.onClick).call(exports, valOpts.data);
    }
  };
  function notifyWithOpts(notifyFn) {
    notifyFn(valOpts.iconURL, valOpts.title, valOpts.text, !!clickObserver,
             valOpts.data, clickObserver);
  }
  try {
    notifyWithOpts(notify);
  }
  catch (err if err instanceof Ci.nsIException &&
                err.result == Cr.NS_ERROR_FILE_NOT_FOUND) {
    console.warn("The notification icon named by " + valOpts.iconURL +
                 " does not exist.  A default icon will be used instead.");
    delete valOpts.iconURL;
    notifyWithOpts(notify);
  }
  catch (err) {
    notifyWithOpts(notifyUsingConsole);
  }
};

function notifyUsingConsole(iconURL, title, text) {
  title = title ? "[" + title + "]" : "";
  text = text || "";
  let str = [title, text].filter(function (s) s).join(" ");
  console.log(str);
}

function validateOptions(options) {
  return apiUtils.validateOptions(options, {
    data: {
      is: ["string", "undefined"]
    },
    iconURL: {
      is: ["string", "undefined"]
    },
    onClick: {
      is: ["function", "undefined"]
    },
    text: {
      is: ["string", "undefined"]
    },
    title: {
      is: ["string", "undefined"]
    }
  });
}
