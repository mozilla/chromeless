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

exports.testOnClick = function (test) {
  let [loader, mockAlertServ] = makeLoader(test);
  let notifs = loader.require("notifications");
  let data = "test data";
  let opts = {
    onClick: function (clickedData) {
      test.assertEqual(this, notifs, "|this| should be notifications module");
      test.assertEqual(clickedData, data,
                       "data passed to onClick should be correct");
    },
    data: data,
    title: "test title",
    text: "test text",
    iconURL: "test icon URL"
  };
  notifs.notify(opts);
  mockAlertServ.click();
  loader.unload();
};

// Returns [loader, mockAlertService].
function makeLoader(test) {
  let loader = test.makeSandboxedLoader();
  let mockAlertServ = {
    showAlertNotification: function (imageUrl, title, text, textClickable,
                                     cookie, alertListener, name) {
      this._cookie = cookie;
      this._alertListener = alertListener;
    },
    click: function () {
      this._alertListener.observe(null, "alertclickcallback", this._cookie);
    }
  };
  let scope = loader.findSandboxForModule("notifications").globalScope;
  scope.notify = mockAlertServ.showAlertNotification.bind(mockAlertServ);
  return [loader, mockAlertServ];
};
