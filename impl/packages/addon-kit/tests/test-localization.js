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
 *   Zbigniew Braniecki <gandalf@mozilla.com> (Original author)
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

let program = require("self");

let myTestPool = {
  'Cancel': {
    'pl': {
      'translation': 'Anuluj',
      'apps': {
        'Testension': {
          'translation': 'Foo2'
        }
      }
    },
    'de': {
       'translation': 'Foo',
    }
  },
  'Add': {
    'pl': {
      'translation': 'Dodaj',
      'apps': function () {
        var o={};
        o[program.id] = {
          'translation': 'Dod2'
        }
        return o;
      }()
    },
    'de': {
       'translation': 'Foo',
    }
  }
}


exports.testGeneric = function (test) {
  let loader = test.makeSandboxedLoader({ globals: { packaging: packaging } });
  let localization = loader.require("localization");
  let global = loader.findSandboxForModule("localization").globalScope;
  // global is the global object inside the loaded module,
  // through which you can access its private definitions.
  global.cps.pool = myTestPool;
  global.locale = "pl";

  let _ = localization.get;

  test.assertEqual(_("Cancel"),
                     "Anuluj",
                     "Generic translation should be used");
  test.assertEqual(_("Add"),
                     "Dod2",
                     "Generic per-app translation should be used");
  loader.unload();
};
