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

const { Trait } = require("traits");
const { List } = require("list");
const { Tab, Options } = require("tabs/tab");
const { EventEmitter } = require("events");
const { EVENTS } = require("tabs/events");

const TAB_BROWSER = "tabbrowser";

/**
 * This is a trait that is used in composition of window wrapper. Trait tracks
 * tab related events of the wrapped window in order to keep truck of open
 * tabs and maintain their wrappers. Every new tab is gets wrapped and jetpack
 * type event is emitted.
 */
const WindowTabTracker = Trait.compose({
  /**
   * Chrome window whose tabs are tracked.
   */
  _window: Trait.required,
  /**
   * Function used to emit events.
   */
  _emit: Trait.required,
  _tabOptions: Trait.required,
  /**
   * Function to add event listeners.
   */
  on: Trait.required,
  /**
   * Live array of the window tabContainers.
   */
  get _tabContainers()
    Array.slice(this._window.document.getElementsByTagName(TAB_BROWSER))
      .map(function(tabBrowser) tabBrowser.tabContainer),
  /**
   * Initializes tab tracker for a browser window.
   */
  _initWindowTabTracker: function _initWindowTabTracker() {
    this.tabs;
    // Some XULRunner apps may have more than one tab browser.
    for each (let tabContainer in this._tabContainers) {
      let tabs = Array.slice(tabContainer.children);
      // Emulating 'open' events for all open tabs.
      for each (let tab in tabs)
        this._onTabEvent(EVENTS.open, { target: tab });
      this._onTabEvent(EVENTS.activate,
                       { target: this._window.gBrowser.selectedTab });
      // Setting event listeners to track tab events.
      for each (let type in EVENTS) {
        if (!type.dom) continue;
        tabContainer.addEventListener(type.dom,
                                      this._onTabEvent.bind(this, type),
                                      false);
      }
    }
  },
  _destroyWindowTabTracker: function _destroyWindowTabTracker() {
    for each (tab in this.tabs)
      tab.close();
    this._tabs._clear();
  },
  /**
   * Tab event router. Function is called on every tab related DOM event.
   * For each event jetpack style event is emitted with a wrapped tab as
   * an argument.
   * @param {String} type
   *  Event type.
   * @param {Event} event
   */
  _onTabEvent: function _onTabEvent(type, event) {
    let options = this._tabOptions.shift() || {};
    options.tab = event.target;
    options.window = this._public;
    var tab = Tab(options);
    // Piping 'ready' events from open tabs to the window listeners.
    if (type == EVENTS.open)
      tab.on(EVENTS.ready.name, this._emitEvent.bind(this, EVENTS.ready));
    this._emitEvent(type, tab);
  },
  _emitEvent: function _emitEvent(type, tab) {
    // Notifies combined tab list that tab was added / removed.
    tabs._emit(type.name, tab);
    // Notifies contained tab list that window was added / removed.
    this._tabs._emit(type.name, tab);
  }
});
exports.WindowTabTracker = WindowTabTracker;

/**
 * This trait is used to create live representation of open tab lists. Each
 * window wrapper's tab list is represented by an object created from this
 * trait. It is also used to represent list of all the open windows. Trait is
 * composed out of `EventEmitter` in order to emit 'TabOpen', 'TabClose' events.
 * **Please note** that objects created by this trait can't be exposed outside
 * instead you should expose it's `_public` property, see comments in
 * constructor for details.
 */
const TabList = List.resolve({ constructor: "_init" }).compose(
  // This is ugly, but necessary. Will be removed by #596248
  EventEmitter.resolve({ toString: null }),
  Trait.compose({
    on: Trait.required,
    _emit: Trait.required,
    constructor: function TabList(options) {
      this._window = options.window;
      this.on('error', this._onError = this._onError.bind(this));
      // Add new items to the list
      this.on(EVENTS.open.name, this._add.bind(this));
      // Remove closed items from the list
      this.on(EVENTS.close.name, this._remove.bind(this));
      // Emit events for closed items
      this.on(EVENTS.activate.name, this._onActivate.bind(this));
      // Initialize list.
      this._init();
      // This list is not going to emit any events, object holding this list
      // will do it instead, to make that possible we return a private API.
      return this;
    },
    _onActivate: function _onActivate(value) {
      this._emit(EVENTS.deactivate.name, this._activeTab);
      this._activeTab = value;
    },
    _onError: function _onError(error) {
      if (1 <= this._listeners('error').length)
        console.exception(error);
    },
    get activeTab() this._activeTab,
    _activeTab: null,

    open: function open(options) {
      options = Options(options);
      this._window._tabOptions.push(options);
      let tab = this._window._window.gBrowser.addTab(options.url);
      if (!options.inBackground)
        this._window._window.gBrowser.selectedTab = tab;
    }
  // This is ugly, but necessary. Will be removed by #596248
  }).resolve({ toString: null })
);

/**
 * Combined list of all open tabs on all the windows.
 * type {TabList}
 */
var tabs = TabList({ window: null });
exports.tabs = tabs._public;

/**
 * Trait is a part of composition that represents window wrapper. This trait is
 * composed out of `WindowTabTracker` that allows it to keep track of open tabs
 * on the window being wrapped.
 */
const WindowTabs = Trait.compose(
  WindowTabTracker,
  Trait.compose({
    _window: Trait.required,
    /**
     * List of tabs
     */
    get tabs() (this._tabs || (this._tabs = TabList({ window: this })))._public,
    _tabs: null,
  })
);
exports.WindowTabs = WindowTabs;
