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
 *   Paul O’Shannessy <paul@oshannessy.com> (Original Author)
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

const Request = require("request").Request;

exports.testOptionsValidator = function(test) {
  // First, a simple test to make sure we didn't break normal functionality.
  test.assertRaises(function () {
    Request({
      url: null
    });
  }, 'The option "url" must be one of the following types: string');

  // Next we'll have a Request that doesn't throw from c'tor, but from a setter.
  let req = Request({
    url: "http://playground.zpao.com/jetpack/request/text.php",
    onComplete: function () {}
  });
  test.assertRaises(function () {
    req.url = null;
  }, 'The option "url" must be one of the following types: string');
  // The url shouldn't have changed, so check that
  test.assertEqual(req.url, "http://playground.zpao.com/jetpack/request/text.php");
}

// All tests below here require a network connection. They will be commented out
// when checked in. If you'd like to run them, simply uncomment them.
//
// When we have the means, these tests will be converted so that they don't
// require an external server nor a network connection.

/*
// This is request to a file that exists
exports.testStatus_200 = function (test) {
  test.waitUntilDone();
  var req = Request({
    url: "http://playground.zpao.com/jetpack/request/text.php",
    onComplete: function (response) {
      test.assertEqual(this, req, "`this` should be request");
      test.assertEqual(response.status, 200);
      test.assertEqual(response.statusText, "OK");
      test.done();
    }
  }).get();
}

// This tries to get a file that doesn't exist
exports.testStatus_404 = function (test) {
  test.waitUntilDone();
  Request({
    // the following URL doesn't exist
    url: "http://playground.zpao.com/jetpack/request/nonexistent.php",
    onComplete: function (response) {
      test.assertEqual(response.status, 404);
      test.assertEqual(response.statusText, "Not Found");
      test.done();
    }
  }).get();
}

exports.testSimpleXML = function (test) {
  test.waitUntilDone();
  Request({
    // File originally available at http://www.w3schools.com/xml/note.xml
    url: "http://playground.zpao.com/jetpack/request/note.xml",
    onComplete: function (response) {
      // response.xml should be a document, so lets use it
      test.assertRaises(function() { response.xml },
                        "Sorry, the 'xml' property is no longer available. " +
                        "see bug 611042 for more information.");
      test.done();
      return;
      let xml = response.xml;
      let notes = xml.getElementsByTagName("note");
      // Notes should have length of 1
      test.assertEqual(notes.length, 1, "Should be 1 <note> in the XML");
      let note = notes[0];

      // Silly whitespace text nodes...
      let text = note.childNodes[0];
      test.assertEqual(note.childNodes[0].nodeName, "#text");

      // Just test the next real node
      let to = note.childNodes[1];
      test.assertEqual(to.nodeName, "to");
      test.assertEqual(to.textContent, "Tove");
      test.assertEqual(to.childNodes[0].nodeValue, "Tove");
      test.done();
    }
  }).get();
}

// a simple file with known contents
exports.testSimpleText = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/text.php",
    onComplete: function (response) {
      test.assertEqual(response.text, "Look ma, no hands!\n");
      test.done();
    }
  }).get();
}

// a simple file with a known header
exports.testKnownHeader = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/headers.php",
    onComplete: function (response) {
      test.assertEqual(response.headers["x-zpao-header"], "Jamba Juice");
      test.done();
    }
  }).get();
}

// complex headers
exports.testKnownHeader = function (test) {
  let headers = {
    "x-zpao-header": "Jamba Juice is: delicious",
    "x-zpao-header-2": "foo, bar",
    "Set-Cookie": "foo=bar\nbaz=foo"
  }
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/complex_headers.php",
    onComplete: function (response) {
      for (k in headers) {
        test.assertEqual(response.headers[k], headers[k]);
      }
      test.done();
    }
  }).get();
}

exports.testContentTypeHeader = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/text.txt",
    onComplete: function (response) {
      test.assertEqual(response.headers["Content-Type"], "text/plain");
      test.done();
    }
  }).get();
}

exports.testSimpleJSON = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/json.php",
    onComplete: function (response) {
      assertDeepEqual(test, response.json, { foo: "bar" });
      test.done();
    }
  }).get();
}

exports.testInvalidJSON = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/invalid_json.php",
    onComplete: function (response) {
      test.assertEqual(response.json, null);
      test.done();
    }
  }).get();
}

exports.testGetWithParamsNotContent = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php?foo=bar",
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : { foo: "bar" }
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}

exports.testGetWithContent = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php",
    content: { foo: "bar" },
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : { foo: "bar" }
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}

exports.testGetWithParamsAndContent = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php?foo=bar",
    content: { baz: "foo" },
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : { foo: "bar", baz: "foo" }
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}

exports.testSimplePost = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php",
    content: { foo: "bar" },
    onComplete: function (response) {
      let expected = {
        "POST": { foo: "bar" },
        "GET" : []
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).post();
}

exports.testEncodedContent = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php",
    content: "foo=bar&baz=foo",
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : { foo: "bar", baz: "foo" }
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}

exports.testEncodedContentWithSpaces = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php",
    content: "foo=bar+hop!&baz=foo",
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : { foo: "bar hop!", baz: "foo" }
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}

exports.testGetWithArray = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php",
    content: { foo: [1, 2], baz: "foo" },
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : { foo: [1, 2], baz: "foo" }
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}

exports.testGetWithNestedArray = function (test) {
  test.waitUntilDone();
  Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php",
    content: { foo: [1, 2, [3, 4]], bar: "baz" },
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : this.content
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}

exports.testGetWithNestedArray = function (test) {
  test.waitUntilDone();
  let request = Request({
    url: "http://playground.zpao.com/jetpack/request/getpost.php",
    content: {
      foo: [1, 2, {
        omg: "bbq",
        "all your base!": "are belong to us"
      }],
      bar: "baz"
    },
    onComplete: function (response) {
      let expected = {
        "POST": [],
        "GET" : request.content
      };
      assertDeepEqual(test, response.json, expected);
      test.done();
    }
  }).get();
}
*/

// This is not a proper testing for deep equal, but it's good enough for my uses
// here. It will do type coercion to check equality, but that's good here. Data
// coming from the server will be stringified and so "0" should be equal to 0.
function assertDeepEqual(test, obj1, obj2, msg) {
  function equal(o1, o2) {
    // cover our non-object cases well enough
    if (o1 == o2)
      return true;
    if (typeof(o1) != typeof(o2))
      return false;
    if (typeof(o1) != "object")
      return o1 == o2;

    let e = true;
    for (let [key, val] in Iterator(o1)) {
      e = e && key in o2 && equal(o2[key], val);
      if (!e)
        break;
    }
    for (let [key, val] in Iterator(o2)) {
      e = e && key in o1 && equal(o1[key], val);
      if (!e)
        break;
    }
    return e;
  }
  msg = msg || "objects not equal - " + JSON.stringify(obj1) + " != " +
               JSON.stringify(obj2);
  test.assert(equal(obj1, obj2), msg);
}
