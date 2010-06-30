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
 *   Eric H. Jung <eric.jung@yahoo.com>
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

let timer = require("timer");
let {Cc,Ci} = require("chrome");

// Arbitrary delay needed to avoid weird behavior.
// TODO: We need to find all uses of this and replace them
// with more deterministic solutions.
const ARB_DELAY = 100;

function openBrowserWindow(callback) {
  let window = Cc["@mozilla.org/embedcomp/window-watcher;1"].
                 getService(Ci.nsIWindowWatcher).openWindow(null,
                 "chrome://browser/content/browser.xul",
                 null, "chrome", null);

  function onLoad(event) {
    if (event.target && event.target.defaultView == window) {
      window.removeEventListener("load", onLoad, true);
      let browsers = window.document.getElementsByTagName("tabbrowser");
      try {
        callback(window, browsers[0]);
      }
      catch (e) {
        dump(e);
      }
    }
  }

  window.addEventListener("load", onLoad, true);
  return window;
}

// Select all divs elements in an HTML document
function selectAllDivs(window) {
  let divs = window.document.getElementsByTagName("div");
  let s = window.getSelection();
  if (s.rangeCount > 0)
    s.removeAllRanges();
  for (let i = 0; i < divs.length; i++) {
    let range = window.document.createRange();
    range.selectNode(divs[i]);
    s.addRange(range);
  }
}

function primeTestCase(html, test, callback) {
  let tabBrowser = require("tab-browser");
  let tracker = tabBrowser.whenContentLoaded(
    function(window) {
      callback(window, test);
      timer.setTimeout(function() {
          tracker.unload();
          test.done();
          window.close();
        },
        ARB_DELAY);
    }
  );
  tabBrowser.addTab("data:text/html," + html);
}

const DIV1 = '<div id="foo">bar</div>';
const DIV2 = '<div>noodles</div>';
const HTML_MULTIPLE = '<html><body>' + DIV1 + DIV2 + '</body></html>';
const HTML_SINGLE = '<html><body>' + DIV1 + '</body></html>';

// Tests of contiguous

exports.testContiguousMultiple = function testContiguousMultiple(test) {
  let selection = require("selection");
  primeTestCase(HTML_MULTIPLE, test, function(window, test) {
    selectAllDivs(window);
    test.assertEqual(selection.contiguous, false,
      "selection.contiguous multiple works.");
  });

  test.waitUntilDone(5000);
};

exports.testContiguousSingle = function testContiguousSingle(test) {
  let selection = require("selection");
  primeTestCase(HTML_SINGLE, test, function(window, test) {
    selectAllDivs(window);
    test.assertEqual(selection.contiguous, true,
      "selection.contiguous single works.");
  });

  test.waitUntilDone(5000);
};

exports.testContiguousNull = function testContiguousNull(test) {
  let selection = require("selection");
  primeTestCase(HTML_SINGLE, test, function(window, test) {
    test.assertEqual(selection.contiguous, null,
      "selection.contiguous null works.");
  });

  test.waitUntilDone(5000);
};

/**
 * Test that setting the contiguous property has no effect.
 */
/*exports.testSetContiguous = function testSetContiguous(test) {
  let selection = require("selection");
  primeTestCase(HTML_MULTIPLE, test, function(window, test) {
    selectAllDivs(window);
    try {
      selection.contiguous = true;
      test.assertEqual(selection.contiguous, false,
        "setting selection.contiguous doesn't work (as expected).");
    }
    catch (e) {
      test.pass("setting selection.contiguous doesn't work (as expected).");
    }
  });

  test.waitUntilDone(5000);
};*/


// HTML tests

exports.testGetHTMLSingleSelection = function testGetHTMLSingleSelection(test) {
  let selection = require("selection");
  primeTestCase(HTML_SINGLE, test, function(window, test) {
    selectAllDivs(window);
    test.assertEqual(selection.html, DIV1, "get html selection works");
  });

  test.waitUntilDone(5000);
};

/* Myk's comments: This is fine.  However, it reminds me to figure out and
   specify whether iteration is ordered.  If so, we'll want to change this
   test in the future to test that the discontiguous selections are returned in
   the appropriate order. In the meantime, add a comment to that effect here */
exports.testGetHTMLMultipleSelection =
  function testGetHTMLMultipleSelection(test) {
    let selection = require("selection");
    primeTestCase(HTML_MULTIPLE, test, function(window, test) {
      selectAllDivs(window);
      let assertions = false;
      for each (let i in selection) {
        test.assertEqual(true, [DIV1, DIV2].some(function(t) t == i.html),
          "get multiple selection html works");
        assertions = true;
      }
      // Ensure we ran at least one assertEqual()
      test.assert(assertions, "No assertions were called");
    });

    test.waitUntilDone(5000);
};

exports.testGetHTMLNull = function testGetHTMLNull(test) {
  let selection = require("selection");
  primeTestCase(HTML_SINGLE, test, function(window, test) {
    test.assertEqual(selection.html, null, "get html null works");
  });

  test.waitUntilDone(5000);
};

exports.testGetHTMLWeird = function testGetHTMLWeird(test) {
  let selection = require("selection");
  // If the getter is used when there are contiguous selections, the first
  // selection should be returned
  primeTestCase(HTML_MULTIPLE, test, function(window, test) {
    selectAllDivs(window);
    test.assertEqual(selection.html, DIV1, "get html weird works");
  });

  test.waitUntilDone(5000);
};

const REPLACEMENT_HTML = "<b>Lorem ipsum dolor sit amet</b>";

exports.testSetHTMLSelection = function testSetHTMLSelection(test) {
  let selection = require("selection");
  primeTestCase(HTML_SINGLE, test, function(window, test) {
    selectAllDivs(window);
    selection.html = REPLACEMENT_HTML;
    test.assertEqual(selection.html, "<span>" + REPLACEMENT_HTML +
      "</span>", "selection html works");
  });

  test.waitUntilDone(5000);
};

exports.testSetHTMLException = function testSetHTMLException(test) {
  let selection = require("selection");
  primeTestCase(HTML_SINGLE, test, function(window, test) {
    try {
      selection.html = REPLACEMENT_HTML;
      test.fail("set HTML throws when there's no selection.");
    }
    catch (e) {
      test.pass("set HTML throws when there's no selection.");
    }
  });

  test.waitUntilDone(5000);
};

const TEXT1 = "foo";
const TEXT2 = "noodles";
const TEXT_MULTIPLE = "<html><body><div>" + TEXT1 + "</div><div>" + TEXT2 +
  "</div></body></html>";
const TEXT_SINGLE = "<html><body><div>" + TEXT1 + "</div></body></html>";

// Text tests

exports.testGetTextSingleSelection =
  function testGetTextSingleSelection(test) {
  let selection = require("selection");
    primeTestCase(TEXT_SINGLE, test, function(window, test) {
      selectAllDivs(window);
      test.assertEqual(selection.text, TEXT1, "get text selection works");
    });

    test.waitUntilDone(5000);
};

exports.testGetTextMultipleSelection =
  function testGetTextMultipleSelection(test) {
  let selection = require("selection");
    primeTestCase(TEXT_MULTIPLE, test, function(window, test) {
      selectAllDivs(window);
      let assertions = false;
      for each (let i in selection) {
        test.assertEqual(true, [TEXT1, TEXT2].some(function(t) t == i.text),
          "get multiple selection text works");
        assertions = true;
      }
      // Ensure we ran at least one assertEqual()
      test.assert(assertions, "No assertions were called");
    });

    test.waitUntilDone(5000);
};

exports.testGetTextNull = function testGetTextNull(test) {
  let selection = require("selection");
  primeTestCase(TEXT_SINGLE, test, function(window, test) {
    test.assertEqual(selection.text, null, "get text null works");
  });

  test.waitUntilDone(5000);
};

exports.testGetTextWeird = function testGetTextWeird(test) {
  let selection = require("selection");
  // If the getter is used when there are contiguous selections, the first
  // selection should be returned
  primeTestCase(TEXT_MULTIPLE, test, function(window, test) {
    selectAllDivs(window);
    test.assertEqual(selection.text, TEXT1, "get text weird works");
  });

  test.waitUntilDone(5000);
};

const REPLACEMENT_TEXT = "Lorem ipsum dolor sit amet";

exports.testSetTextSelection = function testSetTextSelection(test) {
  let selection = require("selection");
  primeTestCase(TEXT_SINGLE, test, function(window, test) {
    selectAllDivs(window);
    selection.text = REPLACEMENT_TEXT;
    test.assertEqual(selection.text, REPLACEMENT_TEXT, "selection text works");
  });

  test.waitUntilDone(5000);
};

exports.testSetHTMLException = function testSetHTMLException(test) {
  let selection = require("selection");
  primeTestCase(TEXT_SINGLE, test, function(window, test) {
    try {
      selection.text = REPLACEMENT_TEXT;
      test.fail("set HTML throws when there's no selection.");
    }
    catch (e) {
      test.pass("set HTML throws when there's no selection.");
    }
  });

  test.waitUntilDone(5000);
};

// Iterator tests

exports.testIterator = function testIterator(test) {
  let selection = require("selection");
  let selectionCount = 0;
  primeTestCase(TEXT_MULTIPLE, test, function(window, test) {
    selectAllDivs(window);
    for each (let i in selection)
      selectionCount++;
    test.assertEqual(2, selectionCount, "iterator works.");
  });

  test.waitUntilDone(5000);
};

/* onSelect tests */

/*
function sendSelectionSetEvent(window) {
  const Ci = Components.interfaces;
  let utils = window.QueryInterface(Ci.nsIInterfaceRequestor).
                                    getInterface(Ci.nsIDOMWindowUtils);
  if (!utils.sendSelectionSetEvent(0, 1, false))
    dump("**** sendSelectionSetEvent did not select anything\n");
  else
    dump("**** sendSelectionSetEvent succeeded\n");
}

// testOnSelect() requires nsIDOMWindowUtils, which is only available in
// Firefox 3.7+.
exports.testOnSelect = function testOnSelect(test) {
  let selection = require("selection");
  let callbackCount = 0;
  primeTestCase(TEXT_SINGLE, test, function(window, test) {
    selection.onSelect = function() {callbackCount++};
    // Now simulate the user selecting stuff
    sendSelectionSetEvent(window);
    selection.text = REPLACEMENT_TEXT;
    test.assertEqual(1, callbackCount, "onSelect text listener works.");
    //test.pass();
    //test.done();
  });

  test.waitUntilDone(5000);
};

// testOnSelectExceptionNoBubble() requires nsIDOMWindowUtils, which is only
// available in Firefox 3.7+.
exports.testOnSelectExceptionNoBubble =
  function testOnSelectTextSelection(test) {
    let selection = require("selection");
    primeTestCase(HTML_SINGLE, test, function(window, test) {
      selection.onSelect = function() {
        throw new Error("Exception thrown in testOnSelectExceptionNoBubble");
      };
      // Now simulate the user selecting stuff
      sendSelectionSetEvent(window);
      test.pass("onSelect catches exceptions.");
    });

    test.waitUntilDone(5000);
};
*/

// If the module doesn't support the app we're being run in, require() will
// throw.  In that case, remove all tests above from exports, and add one dummy
// test that passes.
try {
  require("selection");
}
catch (err) {
  // This bug should be mentioned in the error message.
  let bug = "https://bugzilla.mozilla.org/show_bug.cgi?id=560716";
  if (err.message.indexOf(bug) < 0)
    throw err;
  for (let [prop, val] in Iterator(exports)) {
    if (/^test/.test(prop) && typeof(val) === "function")
      delete exports[prop];
  }
  exports.testAppNotSupported = function (test) {
    test.pass("The selection module does not support this application.");
  };
}
