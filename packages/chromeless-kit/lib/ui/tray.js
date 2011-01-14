/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* vim:set ts=4 sw=4 sts=4 et: */
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
 * The Initial Developer of the Original Code is
 * Mike de Boer, Ajax.org.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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

const {Cc,Ci} = require("chrome");
var ui = require("ui");

/**
 * Empty the tray of all this application's tray items
 */
exports.Tray = function Tray(icon, hint, menu) {
    if (icon)
        this.setIcon(icon);
    if (hint)
        this.setHint(hint);
    if (menu)
        this.setMenu(menu);
};

(function() {
    this._hint = "";
    this._icon = null;
    this._menu = null;

    /**
     * Get the icon URL for this TrayItem
     */
    this.getIcon = function getIcon() {
        return this._icon;
    };
    
    /**
     * Sets a TrayItem's icon
     */
    this.setIcon = function setIcon(appIcon) {
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var iconUri = ioService.newFileURI(appIcon);
        
        this._icon = ui.getIcon();
        this._icon.title = this._hint;
        this._icon.imageSpec = iconUri.spec;
        this._icon.show();
        
        return this;
    };

    /**
     * Get the hint for this TrayItem
     */
    this.getHint = function getHint() {
        // @todo
    };
    
    /**
     * Sets a TrayItem's tooltip
     */
    this.setHint = function setHint(hint) {
        this._hint = (typeof hint == "string") ? hint : "";
        if (this._icon)
            this._icon.title = this._hint;

        return this;
    };
    
    /**
     * Get the menu for this TrayItem
     */
    this.getMenu = function getMenu() {
        return this._menu
    };
    
    /**
     * Set the menu for this TrayItem
     */
    this.setMenu = function setMenu() {
        // @todo
        
        return this;
    };
    
    /**
     * Removes a TrayItem
     */
    this.remove = function remove() {
        // @todo
        return this;
    };
}).call(Tray.prototype);
