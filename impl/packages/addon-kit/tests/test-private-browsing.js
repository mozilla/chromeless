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
 * Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Paul O’Shannessy <paul@oshannessy.com>
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

let pb = require("private-browsing");
let {Cc,Ci} = require("chrome");

let pbService;
// Currently, only Firefox implements the private browsing service.
if (require("xul-app").is("Firefox")) {
  pbService = Cc["@mozilla.org/privatebrowsing;1"].
              getService(Ci.nsIPrivateBrowsingService);
}

if (pbService) {
  // a method used to reset all the callbacks for the next test run
  function reset(active) {
    active = active === undefined ? false : active;
    pb.onBeforeStart = [];
    pb.onStart = [];
    pb.onBeforeStop = [];
    pb.onStop = [];
    // Use the service since that's guaranteed
    pbService.privateBrowsingEnabled = active;
  }


  // tests that active has the same value as the private browsing service expects
  exports.testGetActive = function (test) {
    reset();
    test.assertEqual(pb.active, false,
                     "private-browsing.active is correct without modifying PB service");

    pbService.privateBrowsingEnabled = true;
    test.assertEqual(pb.active, true,
                     "private-browsing.active is correct after modifying PB service");
  }


  // tests that setting active does put the browser into private browsing mode
  exports.testSetActive = function (test) {
    reset();
    pb.active = true;
    test.assertEqual(pbService.privateBrowsingEnabled, true,
                     "private-browsing.active=true enables private browsing mode");
    pb.active = false;
    test.assertEqual(pbService.privateBrowsingEnabled, false,
                     "private-browsing.active=false disables private browsing mode");
  }


  // tests the basic cases for onBeforeStart callbacks
  exports.testSimpleOnBeforeStart = function (test) {
    reset();
    let count = 0;
    function simpleOnBeforeStart(cancelFn) {
      count++;
    }
    pb.onBeforeStart = simpleOnBeforeStart;
    pb.active = true;
    test.assertEqual(count, 1, "All onBeforeStart methods were called");
    test.assertEqual(pb.active, true,
                     "onBeforeStart didn't cancel when it wasn't supposed");
    pb.active = false;

    // Now let's make it more complicated...
    function simpleOnBeforeStart2(cancelFn) {
      count += 2;
    }
    pb.onBeforeStart = [simpleOnBeforeStart, simpleOnBeforeStart2];
    pb.active = true;
    test.assertEqual(count, 4, "All onBeforeStart methods were called");
    test.assertEqual(pb.active, true,
                     "onBeforeStart didn't cancel when it wasn't supposed");
  }


  // tests the basic cases for onStart callbacks
  exports.testSimpleOnStart = function (test) {
    reset();
    let count = 0;
    function simpleOnStart() {
      count++;
    }
    pb.onStart = simpleOnStart;
    pb.active = true;
    test.assertEqual(count, 1, "simpleonStart was called");
    pb.active = false;

    // Now let's make it more complicated...
    function simpleOnStart2() {
      count += 2;
    }
    pb.onStart = [simpleOnStart, simpleOnStart2];
    pb.active = true;
    test.assertEqual(count, 4, "simpleOnStart was called");
  }


  // tests that canceling from inside onBeforeStart prevents onStart callbacks from running
  exports.testOnBeforeStartCancel = function (test) {
    reset();
    let wasActivated = false;
    pb.onBeforeStart = function (cancelFn) {
      cancelFn();
    }
    pb.onStart = function () {
      wasActivated = true;
    }
    pb.active = true;

    test.assertEqual(pb.active, false, "Private Browsing enter was cancelled");
    test.assertEqual(wasActivated, false, "onStart wasn't called");
  }


  // tests the basic case for onAfterStart callbacks
  exports.testSimpleOnAfterStart = function (test) {
    test.waitUntilDone();
    reset();
    pb.onAfterStart = function () {
      test.assert(true, "onAfterStart was called");
      test.done();
    }
    pb.active = true;
  }


  // tests the basic cases for onBeforeStop callbacks
  exports.testSimpleOnBeforeStop = function (test) {
    reset(true);
    let count = 0;
    function simpleOnBeforeStop(cancelFn) {
      count++;
    }
    pb.onBeforeStop = simpleOnBeforeStop;
    pb.active = false;
    test.assertEqual(count, 1, "All onBeforeStop methods were called");
    test.assertEqual(pb.active, false,
                     "onBeforeStop didn't cancel when it wasn't supposed");
    pb.active = true;

    // Now let's make it more complicated...
    function simpleOnBeforeStop2(cancelFn) {
      count += 2;
    }
    pb.onBeforeStop = [simpleOnBeforeStop, simpleOnBeforeStop2];
    pb.active = false;
    test.assertEqual(count, 4, "All onBeforeStop methods were called");
    test.assertEqual(pb.active, false,
                     "onBeforeStop didn't cancel when it wasn't supposed");
  }


  // tests the basic cases for onStop callbacks
  exports.testSimpleOnStop = function (test) {
    reset(true);
    let count = 0;
    function simpleOnStop() {
      count++;
    }
    pb.onStop = simpleOnStop;
    pb.active = false;
    test.assertEqual(count, 1, "All onStop methods were called");
    pb.active = true;

    // Now let's make it more complicated...
    function simpleOnStop2() {
      count += 2;
    }
    pb.onStop = [simpleOnStop, simpleOnStop2];
    pb.active = false;
    test.assertEqual(count, 4, "All onStop methods were called");
  }


  // tests that canceling from inside onBeforeStop prevents onStop callbacks from running
  exports.testOnBeforeStopCancel = function (test) {
    reset();
    let wasDeactivated = false;
    pb.onBeforeStop = function (cancelFn) {
      cancelFn();
    }
    pb.onStop = function () {
      wasDeactivated = true;
    }
    pb.active = true;

    test.assertEqual(pb.active, true, "Private Browsing exit was cancelled");
    test.assertEqual(wasDeactivated, false, "onStop wasn't called");
  }


  // tests the basic case for onAfterStop callbacks
  exports.testSimpleOnAfterStop = function (test) {
    test.waitUntilDone();
    reset();
    pb.onAfterStop = function () {
      test.assert(true, "onAfterStop was called");
      test.done();
    }
    pb.active = true;
  }


  // tests that |this| is |pb| inside each of the Start callbacks
  exports.testCallbackThisStart = function (test) {
    test.waitUntilDone();
    reset();
    pb.onBeforeStart = function (cancel) {
      test.assertEqual(this, pb, "|this| == pb in onBeforeStart");
    };
    pb.onStart = function () {
      test.assertEqual(this, pb, "|this| == pb in onStart");
    };
    pb.onAfterStart = function () {
      test.assertEqual(this, pb, "|this| == pb in onAfterStart");
      test.done();
    };
    pb.active = true;
  }


  // test that |this| is |pb| inside each of the Stop callbacks
  exports.testCallbackThisStop = function (test) {
    test.waitUntilDone();
    reset(true);
    pb.onBeforeStop = function (cancel) {
      test.assertEqual(this, pb, "|this| == pb in onBeforeStop");
    };
    pb.onStop = function () {
      test.assertEqual(this, pb, "|this| == pb in onStop");
    };
    pb.onAfterStop = function () {
      test.assertEqual(this, pb, "|this| == pb in onAfterStop");
      test.done();
    };
    pb.active = false;
  }
}
else {
  // tests for the case where private browsing doesn't exist
  exports.testNoImpl = function (test) {
    test.assertEqual(pb.active, false,
                     "pb.active returns false when private browsing isn't supported");


    // Setting pb.active = true shouldn't have any effect. Also, no callbacks
    // should have been called. We'll just test one callback since they are
    // under the same code path.
    let wasActivated = false;
    pb.onStart = function () {
      wasActivated = true;
    }
    pb.active = true;
    test.assertEqual(pb.active, false,
                     "pb.active returns false even when set to true");
    test.assertEqual(wasActivated, false,
                     "onStart callback wasn't run when PB isn't supported");
  }
}
