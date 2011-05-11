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
 *   Marcio Galli <mgalli@mgalli.com>
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

/**
 * Allows one to control fullscreen view for the main application window
 *
 * NOTE: Due to a bug in Gecko, enabling fullscreen mode inside the
 * load handler for application code will not properly hide the taskbar.
 * A workaround is to delay fullscreen mode toggling for some small number
 * of milliseconds after page load (i.e. with `setTimeout()`)
 */

const windowUtils = require('window-utils');

function supplyDefault(window) {
  return (window === undefined) ? windowUtils.activeWindow : window;
}


/**
 * Size the main application window to consume the full screen.
 * @param [window] {WindowObject} the window to modify, default is
 * current active window.
 */
exports.enable = function(window) {
    window = supplyDefault(window);
    window.fullScreen=true;
};

/**
 * Disable fullscreen mode (noop if it wasn't enabled)
 * @param [window] {WindowObject} the window to modify, default is
 * current active window.
 */
exports.disable = function(window) {
    window = supplyDefault(window);
    window.fullScreen=false;
};

/**
 * Toggle fullscreen.
 * @param [window] {WindowObject} the window to modify, default is
 * current active window.
 */
exports.toggle = function(window) {
    window = supplyDefault(window);
    window.fullScreen=!window.fullScreen;
};
