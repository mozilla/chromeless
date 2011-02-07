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

const {Cc, Ci, Cr} = require("chrome"),
      ui = require("ui");

const modifiers = {"shift": 1, "alt": 1, "meta": 1, "control": 1, "accel": 1, "access": 1, "any": 1};
var keySet,
    bindings = {};

function splitSafe(s, separator, limit, bLowerCase) {
    return (bLowerCase && (s = s.toLowerCase()) || s)
        .replace(/(?:^\s+|\n|\s+$)/g, "")
        .split(new RegExp("[\\s ]*" + separator + "[\\s ]*", "g"), limit || 999);
}

function getKeyset() {
    if (keySet)
        return keySet;
    let doc  = ui.getMainWindow().document;
        sets = doc.getElementsByTagName("keyset");
    if (sets.length)
        return (keySet = sets[0]);
    return (keySet = doc.getElementsByTagName("window")[0].appendChild(doc.createElement("keyset")));
}

function parseHotkey(hotkey) {
    let key,
        keys = splitSafe(hotkey, "\\-", null, true),
        mods = [];
    for (let i = 0, l = keys.length; i < l; ++i) {
        key = keys[i];
        if (modifiers[key])
            mods.push(key), key = null;
    }
    return {key: key, modifiers: mods};
}

function getBinding(hotkey, command) {
    let bind,
        {key, modifiers} = parseHotkey(hotkey),
        mods = modifiers.join(" ");

    for (let i in bindings) {
        if (!bindings.hasOwnProperty(i))
            continue;
        bind = bindings[i];
        if (bind.getAttribute("key") !== key && bind.getAttribute("modifiers") !== mods)
            return;
        if (typeof command == "string") {
            if (bind.getAttribute("command") === command)
                return bind;
        }
        else if (bind._command === command) {
            return bind;
        }
    }
}

/**
 * Register a global hotkey that executes JS specified [command] when the key
 * combination in [hotkey] is pressed.
 * 
 * @throws {String} Textual exception that should be caught by the programmer.
 * 
 * @param {String} hotkey Key combination in the format of 'modifier-key'
 *   Examples:
 *     accel-s, meta-shift-i, control-alt-d
 *   Modifier keynames:
 *     shift: The Shift key.
 *     alt: The Alt key. On the Macintosh, this is the Option key. On Macintosh 
 *          this can only be used in conjunction with another modifier, since 
 *          Alt+Letter combinations are reserved for entering special characters 
 *          in text.
 *     meta: The Meta key. On the Macintosh, this is the Command key.
 *     control: The Control key.
 *     accel: The key used for keyboard shortcuts on the user's platform, which 
 *            is Control on Windows and Linux, and Command on Mac. Usually, this 
 *            would be the value you would use.
 *     access: The access key for activating menus and other elements. On Windows, 
 *             this is the Alt key, used in conjuction with an element's accesskey.
 *     any: Indicates that all modifiers preceding it are optional.
 * @param {String/Function} command Javascript (may be of type String or Function) 
 *                                  to execute when the hotkey is executed.
 * @param {String} [id] Optional. Unique identifier for this hotkey, which will 
 *                      auto-generated if not provided.
 * @type  {String} Return the ID of the hotkey.
 */
exports.register = function(hotkey, command, id) {
    let {key, modifiers} = parseHotkey(hotkey);
    if (!key)
        throw "Please provide a valid key for a keybinding to work!";
    if (!modifiers.length)
        throw "Please provide at least one modifier key for a keybinding to work!";
    // do it naively for now, without checking IF the hotkey is already registered, 
    // but to another command.
    let doc  = ui.getMainWindow().document,
        node = getKeyset().appendChild(doc.createElement("key"));
    if (!id)
        id = ui.getUUID();
    bindings[id] = node;
    node.setAttribute("id", id);
    node.setAttribute("modifiers", modifiers.join(" "));
    node.setAttribute("key", key);
    if (typeof command == "string") {
        node.setAttribute("command", command);
    }
    else {
        node.setAttribute("oncommand", "this._command()");
        node._command = command;
    }
    return id;
};

/**
 * Register a global hotkey.
 * @see register
 * @throws {String} Textual exception that should be caught by the programmer.
 * 
 * @param {String} hotkey
 * @param {String/Function} command
 * @param {String} [id]
 * @type  {void}
 */
exports.unregister = function(hotkey, command, id) {
    if (id) {
        if (!bindings[id])
            throw "There is no hotkey registered with id '" + id + "'";
        bindings[id].parentNode.removeChild(bindings[id]);
    }
    let bind = getBinding(hotkey, command);
    if (!bind)
        throw "Hotkey '" + hotkey + "' is not registered yet";
    bind.parentNode.removeChild(bind);
};
