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
      utils   = require("api-utils"),
      hotkeys = require("hotkey"),
      ui      = require("ui"),
      _slice  = Array.prototype.slice;

/**
 * Mixes all enumerable members of [mixin] into [obj]
 * 
 * @param {Object} obj
 * @param {Object} mixin
 * @type  {void}
 * @private
 */
function mixin(obj, mixin) {
    for (let key in mixin)
        obj[key.toLowerCase()] = mixin[key];
};

/**
 * Sets the parentNode of a Menu, SubMenu or Seperator instance and its children.
 * When a parentNode is set that is already appended to a rooted XUL node, the
 * item may be drawn on 'canvas' as well. This is an implementation of lazy 
 * rendering.
 * Each instance of Menu, SubMenu and Seperator have this function set as member
 * property.
 *
 * @param {mixed} parent Parent node, which may be a XulElement, Menu or SubMenu
 * @type  {void}
 * @private
 */
function setParent(parent) {
    if (!parent)
        return;
    this.parent = parent;
    if (((parent instanceof Menu) || (parent instanceof SubMenu)) && parent.drawn) {
        this.parentNode = parent.node;
        this.draw();
    }
    else if (parent.ownerDocument) {
        this.parentNode = parent;
        this.draw();
    }
    if (this.length) {
        for (let i = 0, l = this.length; i < l; ++i)
            this[i].setParent && this[i].setParent(this);
    }
    if (this.children && this.children.length)
        this.children.setParent(this);
}

/**
 * Menu class, which represents any single menu item that should be displayed 
 * with at least a label.
 * Example:
 *     var ui   = require("ui"),
 *         menu = require("ui/menu");
 * 
 *     var file = new menu.Menu({
 *         parent: ui.getMenu(),
 *         label: "File",
 *         children: [
 *             new menu.Menu({
 *                 label: "New Window",
 *                 hotkey: "accel-n",
 *                 type: "radio",
 *                 checked: true,
 *                 onClick: function(e) {
 *                     alert("yay!");
 *                 }
 *             }),
 *             new menu.Menu({
 *                 label: "New Tab",
 *                 children: [
 *                     new menu.Menu({ label: "In the current window" }),
 *                     new menu.Menu({ label: "In a new window" }),
 *                 ]
 *             })
 *         ]
 *     });
 * 
 * @constructor
 * @param {object} struct a set of options/ properties that will be set on the 
 *                        menu item. Keys are case-insensitive.
 * @type  {Menu}
 */
var Menu = function(struct) {
    this.drawn = false;
    this.parentNode = null;
    mixin(this, struct);
    this.children = this.children && this.children.length ? this.children : [];

    if (this.children.length) {
        // verify proper mutual exclusivity
        let _self = this;
        var offending = ["hotkey", "image", "enabled", "onclick", "name"].filter(function(f) {
            return _self[f] != undefined;
        });
        if (offending.length > 0) {
            throw "menuitems with children may not also have: '" +
                offending.join("' nor '") + "'";
        }
    }

    this.children = new SubMenu(this.children, this);
    setParent.call(this, this.parent);

    let propMap   = {
            hotkey: "key"
        },
        _self     = this,
        label     = this.label,
        hotkey    = this.hotkey,
        image     = this.image,
        type      = this.type,
        checked   = this.checked,
        autocheck = this.autocheck,
        disabled  = this.disabled,
        name      = this.name;
    ["label", "hotkey", "image", "type", "disabled"].forEach(function(prop) {
        this.__defineGetter__(prop, function() { return eval(prop); });
        this.__defineSetter__(prop, function(val) {
            eval(prop + " = val");
            if (!this.drawn || this.children.length)
                return;
            if (prop == "hotkey")
                return this.setHotkey();
            this.node.setAttribute(propMap[prop] || prop, val);
        });
    });

    ["checked", "autocheck", "name"].forEach(function(prop) {
        this.__defineGetter__(prop, function() { return eval(prop); });
        this.__defineSetter__(prop, function(val) {
            eval(prop + " = val");
            if (!this.drawn || this.children.length || "checkbox|radio".indexOf(val) === -1)
                return;
            this.node.setAttribute(propMap[prop] || prop, val);
        });
    });
};

(function() {
    function commandHandler(e) {
        this["onclick"] && this["onclick"](e);
    }

    /**
     * Draw a menu element to the canvas (a XUL document)
     * Usually this function is invoked by setParent()
     * 
     * @type {void}
     */
    this.draw = function() {
        if (this.drawn)
            return;
            
        // generate a menu and a menu popup
        let hasChildren = this.children.length;
        this.node = this.parentNode.ownerDocument.createElement(hasChildren ? "menu" : "menuitem");
        this.node.className = hasChildren ? "menu-iconic" : "menuitem-iconic";
        this.node.setAttribute("label", this.label);
        this.parentNode.appendChild(this.node);

        this.drawn = true;

        if (hasChildren) {
            this.children.setParent(this);
        }
        else {
            if (this.hotkey)
                this.setHotkey();
            if (this.image)
                this.node.setAttribute("image", this.image);
            if (this.disabled)
                this.node.setAttribute("disabled", this.disabled);
            if (this.type) {
                this.node.setAttribute("type", this.type);
                if (this.checked)
                    this.node.setAttribute("checked", this.checked);
                if (this.autocheck)
                    this.node.setAttribute("autocheck", this.autocheck);
                if (this.name)
                    this.node.setAttribute("name", this.name);
            }
            this.node.addEventListener("command", commandHandler.bind(this), true);
        }
        return this.node;
    };

    /**
     * Redraws a menu element to the canvas (a XUL document) if needed.
     * Usually called called by a function that performs a mutation on a SubMenu
     * (like push(), shift() or splice()).
     * 
     * @type {void}
     */
    this.redraw = function() {
        if (!this.drawn)
            return this.parent && this.parent.drawn ? this.setParent(this.parent) : null;
        let hasChildren = this.children.length;
        if (!hasChildren || (hasChildren && this.node.tagName.toLowerCase() == "menu"))
            return; // no redraw needed, already the right setup!

        this.parentNode.removeChild(this.node);
        this.drawn = false;
        this.hotkey = this.image = this.disabled = this.type 
            = this.checked = this.autocheck = this.name = null;
        this.draw();
    };

    /**
     * Register a globally accessible hotkey for this menu item that invokes 
     * the 'onClick' handler if set when the key combination is pressed.
     * @see this.hotkey property
     * 
     * @type {void}
     */
    this.setHotkey = function() {
        if (!this.drawn || this.children.length || !this.hotkey)
            return;

        let id = "menu_" + ui.getUUID();
        hotkeys.register(this.hotkey, commandHandler.bind(this), id);
        this.node.setAttribute("key", id);
    };

    /**
     * Removes a menu item from the canvas (a XUL document) and does basic 
     * garbage collection.
     * 
     * @type {void}
     */
    this.destroy = function() {
        if (!this.drawn)
            return;
        if (this.children.length)
            this.children.detroy();
        this.parentNode.removeChild(this.node);
        delete this.node;
        this.drawn = false;
    };

    /**
     * @see #setParent()
     */
    this.setParent = setParent;
}).call(Menu.prototype);

/**
* SubMenu class, which represents a collection of menu items and separators that
* should be displayed. A SubMenu is defined with the 'children' property of a 
* Menu object as an Array. Therefore, array-like functions may be used to alter
* the contents of a SubMenu instance.
* There is no maximum set to the amount of submenus.
* Example:
*     var ui   = require("ui"),
*         menu = require("ui/menu");
* 
*     var file = new menu.Menu({
*         parent: ui.getMenu(),
*         label: "File",
*         children: [
*             new menu.Menu({
*                 label: "New Window",
*                 hotkey: "accel-n",
*                 type: "radio",
*                 checked: true,
*                 onClick: function(e) {
*                     alert("yay!");
*                 }
*             }),
*             new menu.Separator()
*         ]
*     });
*     file.children.splice(0, 1);
*     file.children.splice(-1, 0, new menu.Menu({ label: "About..." }));
* 
* @constructor
* @param {Array} nodes  a set of options/ properties that will be set on the 
*                        menu item. Keys are case-insensitive.
* @param {Menu}  parent 
* @type  {SubMenu}
*/
var SubMenu = function(nodes, parent) {
    this.drawn = false;
    this.parent = parent;
    this.parentNode = null;
    
    this.length = 0;
    setParent.apply(this, parent);
    this.push.apply(this, nodes);
};

(function() {
    this.draw = function() {
        if (this.drawn || !this.parent.drawn)
            return;

        this.node = this.parentNode.ownerDocument.createElement("menupopup");
        this.parentNode.appendChild(this.node);
        this.drawn = true;
        return this.node;
    };

    this.destroy = function() {
        if (!this.drawn)
            return;
        this.parentNode.removeChild(this.node);
        // make sure to destroy leafs too:
        for (let i = 0, l = this.length; i < l; ++i) {
            this[i].detroy();
            --this.length;
            delete this[i];
        }
        delete this.node;
        this.drawn = false;
    };

    /**
     * Adds one or more elements to the end of an array and returns the new 
     * length of the array.
     */
    this.push = function() {
        var args = _slice.call(arguments);
        for (let i = 0, l = args.length; i < l; ++i) {
            this[this.length] = args[i];
            ++this.length;
            args[i].setParent(this);
        }
        this.parent.redraw && this.parent.redraw();
        return this.length;
    };

    var _self = this;

    ["reverse", "shift", "sort", "splice", "unshift"].forEach(function(func) {
        _self[func] = function() {
            let els = this.toArray();
            els[func].apply(els, _slice.call(arguments));
            this.fromArray(els);
        };
    });

    this.toArray = function() {
        var mock = [];
        for (let i = 0, l = this.length; i < l; ++i)
            mock.push(this[i]);
        return mock;
    };

    this.fromArray = function(arr) {
        let i, l, el, next;
        for (i = 0, l = this.length; i < l; ++i) {
            if (arr.indexOf(this[i]) === -1)
                this[i].destroy();
            delete this[i];
        }
        this.length = 0;
        for (i = 0, l = arr.length; i < l; ++i) {
            el = arr[i];
            next = arr[i + 1];
            this.push(el);
        }
    };

    this.setParent = setParent;
}).call(SubMenu.prototype);

var Separator = function(parent) {
    this.drawn = false;
    this.parentNode = null;
    this.label = "-";
    setParent.call(this, parent);
};

(function() {
    this.draw = function() {
        if (this.drawn)
            return;
        this.node = this.parentNode.appendChild(
            this.parentNode.ownerDocument.createElement("menuseparator"));
        this.drawn = true;
        return this.node;
    };

    this.destroy = function() {
        if (!this.drawn)
            return;
        this.parentNode.removeChild(this.node);
        delete this.node;
        this.drawn = false;
    };

    this.setParent = setParent;
}).call(Separator.prototype);

exports.Menu = utils.publicConstructor(Menu);
exports.Separator = utils.publicConstructor(Separator);
exports.SubMenu = utils.publicConstructor(SubMenu);
