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
 *   Irakli Gozalishvili <gozala@mozilla.com> (Original author)
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
"use strict";

const { WindowLoader } = require('windows/loader'),
      { Trait } = require('traits');

const Loader = Trait.compose(
  WindowLoader,
  {
    constructor: function Loader(options) {
      this._onLoad = options.onLoad;
      this._onUnload = options.onUnload;
      if ('window' in options)
        this._window = options.window;
      this._load();
      this.window = this._window;
    },
    window: null,
    _onLoad: null,
    _onUnload: null,
    _tabOptions: []
  }
);

exports['test compositions with missing required properties'] = function(test) {
  test.assertRaises(
    function() WindowLoader.compose({})(),
    'Missing required property: _onLoad',
    'should throw missing required property exception'
  );
  test.assertRaises(
    function() WindowLoader.compose({ _onLoad: null, _tabOptions: null })(),
    'Missing required property: _onUnload',
    'should throw missing required property `_onUnload`'
  );
  test.assertRaises(
    function() WindowLoader.compose({ _onUnload: null, _tabOptions: null })(),
    'Missing required property: _onLoad',
    'should throw missing required property `_onLoad`'
  );
  test.assertRaises(
    function() WindowLoader.compose({ _onUnload: null, _onLoad: null })(),
    'Missing required property: _tabOptions',
    'should throw missing required property `_tabOptions`'
  );
};

exports['test `load` events'] = function(test) {
  test.waitUntilDone();
  let onLoadCalled = false;
  Loader({
    onLoad: function(window) {
      onLoadCalled = true;
      test.assertEqual(
        window, this._window, 'windows should match'
      );
      test.assertEqual(
        window.document.readyState, 'complete', 'window must be fully loaded'
      );
      window.close();
    },
    onUnload: function(window) {
      test.assertEqual(
        window, this._window, 'windows should match'
      );
      test.assertEqual(
        window.document.readyState, 'complete', 'window must be fully loaded'
      );
      test.assert(onLoadCalled, 'load callback is supposed to be called');
      test.done();
    }
  });
};

exports['test removeing listeners'] = function(test) {
  test.waitUntilDone();
  Loader({
    onLoad: function(window) {
      test.assertEqual(
        window, this._window, 'windows should match'
      );
      window.close();
    },
    onUnload: function(window) {
      test.done();
    }
  });
};

exports['test create loader from opened window'] = function(test) {
  test.waitUntilDone();
  let onUnloadCalled = false;
  Loader({
    onLoad: function(window) {
      test.assertEqual(
        window, this._window, 'windows should match'
      );
      test.assertEqual(
        window.document.readyState, 'complete', 'window must be fully loaded'
      );
      Loader({
        window: window,
        onLoad: function(win) {
          test.assertEqual(win, window, 'windows should match');
          window.close();
        },
        onUnload: function(window) {
          test.assert(onUnloadCalled, 'first handler should be called already');
          test.done();
        }
      });
    },
    onUnload: function(window) {
      onUnloadCalled = true;
    }
  });
};

