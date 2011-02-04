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
      utils = require("api-utils"),
      _slice = Array.prototype.slice;

function mixin(obj, mixin) {
    for (var key in mixin)
        obj[key] = mixin[key];
};

function setParent(parent) {
    if (!parent)
        return;
    this.parent = parent;
    if (((parent instanceof Menu) || (parent instanceof SubMenu)) && parent.drawn) {
        console.log("SETTING PARENT PROPERLY OF A CHILD");
        this.parentNode = parent.node;
        this.draw();
    }
    else if (parent.parentNode) {
        this.parentNode = parent;
        this.draw();
    }
    if (this.length) {
        for (let i = 0, l = this.length; i < l; ++i)
            item.setParent && item.setParent(this);
    }
    if (this.children)
        this.children.setParent(this);
}

var Menu = function(struct) {
    this.drawn = false;
    this.parentNode = null;
    mixin(this, struct);
    this.children = this.children && this.children.length ? this.children : [];
    
    if (this.children.length) {
        // verify proper mutual exclusivity
        let _self = this;
        var offending = ["shortcut","icon","enabled"].filter(function(f) {
            return _self[f] != undefined;
        });
        if (offending.length > 0) {
            throw "menuitems with children may not also have: '" +
                offending.join("' nor '") + "'";
        }
    }
    this.children = new SubMenu(this.children, this);
    setParent.call(this, this.parent);
};

(function() {
    this.draw = function() {
        if (this.drawn)
            return;
            
        // generate a menu and a menu popup
        this.node = this.parentNode.ownerDocument.createElement("menu");
        this.node.className = "menu-iconic";
        this.node.setAttribute("label", this.caption);
        this.parentNode.appendChild(this.node);
        this.drawn = true;
        return this.node;
    };

    this.setParent = setParent;
}).call(Menu.prototype);

var Separator = function(parent) {
    this.drawn = false;
    this.parentNode = null;
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

    this.setParent = setParent;
}).call(Separator.prototype);

var SubMenu = function(nodes, parent) {
    this.drawn = false;
    this.parent = parent;
    this.parentNode = null;
    setParent.call(this, parent);
    this.push.apply(this, nodes);
};

(function() {
    this.draw = function() {
        if (this.drawn || !this.parent.drawn)
            return;
        console.log("drawing submenu..." + this.parentNode.nodeType);
        console.log(this.parentNode);
        this.node = this.parentNode.ownerDocument.createElement("menupopup");
        this.parentNode.appendChild(this.node);
        this.drawn = true;
        return this.node;
    };
    
    var _pop = this.pop;
    /**
     * Removes the last element from an array and returns that element.
     */
    this.pop = function(item) {
        _pop.call(this, item);
        
    };
    
    var _push = this.push;
    /**
     * Adds one or more elements to the end of an array and returns the new length of the array.
     */
    this.push = function() {
        var args = _slice.call(arguments);
        _push.apply(this, args);
    };
    
    var _reverse = this.reverse;
    /**
     * Reverses the order of the elements of an array -- the first becomes the 
     * last, and the last becomes the first.
     */
    this.reverse = function() {
        _reverse.call(this);
    };
    
    var _shift = this.shift;
    /**
     * Removes the first element from an array and returns that element.
     */
    this.shift = function() {
        shift.call(this);
    };
    
    var _sort = this.sort;
    /**
     * Sorts the elements of an array.
     */
    this.sort = function(helper) {
        _sort.call(this, helper);
    };
    
    var _splice = this.splice;
    /**
     * Adds and/or removes elements from an array.
     */
    this.splice = function() {
        var args = _slice.call(arguments);
        _splice.apply(this, args);
    };
    
    var _unshift = this.unshift;
    /**
     * Adds one or more elements to the front of an array and returns the new 
     * length of the array.
     */
    this.unshift = function() {
        var args = _slice.call(arguments);
        _unshift.apply(this, args);
    };

    this.setParent = setParent;
}).call(SubMenu.prototype = Array.prototype);

exports.Menu = utils.publicConstructor(Menu);
exports.Separator = utils.publicConstructor(Separator);
exports.SubMenu = utils.publicConstructor(SubMenu);
