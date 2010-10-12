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
 *   Irakli Gozalishvili <gozala@mozilla.com> (Original Author)
 *   Drew Willcoxon <adw@mozilla.com>
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

const { MatchPattern } = require("match-pattern");

exports.testMatchPatternTestTrue = function(test) {
  function ok(pattern, url) {
    let mp = new MatchPattern(pattern);
    test.assert(mp.test(url), pattern + " should match " + url);
  }

  ok("*", "http://example.com");
  ok("*", "https://example.com");
  ok("*", "ftp://example.com");

  ok("*.example.com", "http://example.com");
  ok("*.example.com", "http://hamburger.example.com");
  ok("*.example.com", "http://hotdog.hamburger.example.com");

  ok("http://example.com*", "http://example.com");
  ok("http://example.com*", "http://example.com/");
  ok("http://example.com/*", "http://example.com/");
  ok("http://example.com/*", "http://example.com/potato-salad");
  ok("http://example.com/pickles/*", "http://example.com/pickles/");
  ok("http://example.com/pickles/*", "http://example.com/pickles/lemonade");

  ok("http://example.com", "http://example.com");
  ok("http://example.com/ice-cream", "http://example.com/ice-cream");
};

exports.testMatchPatternTestFalse = function(test) {
  function ok(pattern, url) {
    let mp = new MatchPattern(pattern);
    test.assert(!mp.test(url), pattern + " should not match " + url);
  }

  ok("*", null);
  ok("*", "");
  ok("*", "bogus");
  ok("*", "chrome://browser/content/browser.xul");
  ok("*", "nttp://example.com");

  ok("*.example.com", null);
  ok("*.example.com", "");
  ok("*.example.com", "bogus");
  ok("*.example.com", "http://example.net");
  ok("*.example.com", "http://foo.com");
  ok("*.example.com", "http://example.com.foo");

  ok("http://example.com/*", null);
  ok("http://example.com/*", "");
  ok("http://example.com/*", "bogus");
  ok("http://example.com/*", "http://example.com");
  ok("http://example.com/*", "http://foo.com/");

  ok("http://example.com", null);
  ok("http://example.com", "");
  ok("http://example.com", "bogus");
  ok("http://example.com", "http://example.com/");
};

exports.testMatchPatternErrors = function(test) {
  test.assertRaises(
    function() new MatchPattern("*.google.com/*"),
    /There can be at most one/,
    "MatchPattern throws when supplied multiple '*'"
  );

  test.assertRaises(
    function() new MatchPattern("google.com"),
    /expected to be either an exact URL/,
    "MatchPattern throws when the wildcard doesn't use '*' and doesn't " +
    "look like a URL"
  );

  test.assertRaises(
    function() new MatchPattern("http://google*.com"),
    /expected to be the first or the last/,
    "MatchPattern throws when a '*' is in the middle of the wildcard"
  );
};

exports.testMatchPatternInternals = function(test) {
  test.assertEqual(
    new MatchPattern("http://google.com/test").exactURL,
    "http://google.com/test"
  );

  test.assertEqual(
    new MatchPattern("http://google.com/test/*").urlPrefix,
    "http://google.com/test/"
  );

  test.assertEqual(
    new MatchPattern("*.example.com").domain,
    "example.com"
  );
};
