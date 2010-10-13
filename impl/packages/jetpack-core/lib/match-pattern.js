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
 * The Initial Developer of the Original Code is Nickolay Ponomarev.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Nickolay Ponomarev <asqueella@gmail.com> (Original Author)
 *   Irakli Gozalishvili <gozala@mozilla.com>
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

const { URL } = require("url");

exports.MatchPattern = MatchPattern;

function MatchPattern(pattern) {
  let firstWildcardPosition = pattern.indexOf("*");
  let lastWildcardPosition = pattern.lastIndexOf("*");
  if (firstWildcardPosition != lastWildcardPosition)
    throw new Error("There can be at most one '*' character in a wildcard.");

  if (firstWildcardPosition == 0) {
    if (pattern.length == 1)
      this.anyWebPage = true;
    else if (pattern[1] != ".")
      throw new Error("Expected a *.<domain name> string, got: " + pattern);
    else
      this.domain = pattern.substr(2);
  }
  else {
    if (pattern.indexOf(":") == -1) {
      throw new Error("When not using *.example.org wildcard, the string " +
                      "supplied is expected to be either an exact URL to " +
                      "match or a URL prefix. The provided string ('" +
                      pattern + "') is unlikely to match any pages.");
    }

    if (firstWildcardPosition == -1)
      this.exactURL = pattern;
    else if (firstWildcardPosition == pattern.length - 1)
      this.urlPrefix = pattern.substr(0, pattern.length - 1);
    else {
      throw new Error("The provided wildcard ('" + pattern + "') has a '*' " +
                      "in an unexpected position. It is expected to be the " +
                      "first or the last character in the wildcard.");
    }
  }
}

MatchPattern.prototype = {

  test: function MatchPattern_test(urlStr) {
    try {
      var url = URL(urlStr);
    }
    catch (err) {
      return false;
    }

    if (this.anyWebPage && /^(https?|ftp)$/.test(url.scheme))
      return true;
    if (this.exactURL && this.exactURL == urlStr)
      return true;
    if (this.domain && url.host && url.host.lastIndexOf(this.domain) ==
                                   url.host.length - this.domain.length)
      return true;
    if (this.urlPrefix && 0 == urlStr.indexOf(this.urlPrefix))
      return true;

    return false;
  }

};
