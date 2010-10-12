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
 *   Myk Melez <myk@mozilla.org> (Original Author)
 *   Irakli Gozalishvili <gozala@mazilla.com>
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

if (!require("xul-app").is("Firefox")) {
  throw new Error([
    "The panel module currently supports only Firefox.  In the future ",
    "we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=jetpack-panel-apps ",
    "for more information."
  ].join(""));
}

const { Ci } = require("chrome");
const { validateOptions: valid } = require("api-utils");
const { Symbiont } = require("content");
const { EventEmitter } = require('events');
const { Registry } = require('utils/registry');

require("xpcom").utils.defineLazyServiceGetter(
  this,
  "windowMediator",
  "@mozilla.org/appshell/window-mediator;1",
  "nsIWindowMediator"
);

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      ON_SHOW = 'popupshown',
      ON_HIDE = 'popuphidden',
      ERR_ADD = "You have to add the panel via require('panel').add() " +
                "before you can show it.",
      validNumber = { is: ['number', 'undefined', 'null'] };

/**
 * Emits show and hide events.
 */
const Panel = Symbiont.resolve({
  constructor: '_init',
  _onInit: '_onSymbiontInit',
  _destructor: '_symbiontDestructor'
}).compose({
  _frame: Symbiont.required,
  _init: Symbiont.required,
  _onSymbiontInit: Symbiont.required,
  _symbiontDestructor: Symbiont.required,
  _emit: Symbiont.required,
  _asyncEmit: Symbiont.required,
  on: Symbiont.required,
  removeListener: Symbiont.required,
  _destructor: Symbiont.required,

  _inited: false,

  /**
   * If set to `true` frame loaders between xul panel frame and
   * hidden frame are swapped. If set to `false` frame loaders are
   * set back to normal. Setting the value that was already set will
   * have no effect.
   */
  set _frameLoadersSwapped(value) {
    if (this.__frameLoadersSwapped == value) return;
    this._frame.QueryInterface(Ci.nsIFrameLoaderOwner)
      .swapFrameLoaders(this._viewFrame);
    this.__frameLoadersSwapped = value;
  },
  __frameLoadersSwapped: false,

  constructor: function Panel(options) {
    this._onShow = this._onShow.bind(this);
    this._onHide = this._onHide.bind(this);
    PanelRegistry.on('add', this._onAdd.bind(this));
    PanelRegistry.on('remove', this._onRemove.bind(this));
    this.on('inited', this._onSymbiontInit.bind(this));

    options = options || {};
    if ('onShow' in options)
      this.on('show', options.onShow);
    if ('onHide' in options)
      this.on('hide', options.onHide);
    if ('width' in options)
      this.width = options.width;
    if ('height' in options)
      this.height = options.height;
    if ('contentURL' in options)
      this.contentURL = options.contentURL;

    this._init(options);
  },
  _destructor: function _destructor() {
    PanelRegistry.remove(this._public);
    this._removeAllListeners('show');
    // defer cleanup to be performed after panel gets hidden
    this._xulPanel = null;
    this._symbiontDestructor(this);
    this._removeAllListeners(this, 'hide');
  },
  /* Public API: Panel.width */
  get width() this._width,
  set width(value)
    this._width = valid({ $: value }, { $: validNumber }).$ || this._width,
  _width: 320,
  /* Public API: Panel.height */
  get height() this._height,
  set height(value)
    this._height =  valid({ $: value }, { $: validNumber }).$ || this._height,
  _height: 240,
  /* Public API: Panel.show */
  show: function show(anchor) {
    // do nothing if already open
    if (!PanelRegistry.has(this))
      throw new Error(ERR_ADD);

    anchor = anchor || null;
    let document = getWindow(anchor).document;
    let xulPanel = this._xulPanel;
    if (!xulPanel) {
      xulPanel = this._xulPanel = document.createElementNS(XUL_NS, 'panel');
      let frame = document.createElementNS(XUL_NS, 'iframe');
      frame.setAttribute('type', 'content');
      frame.setAttribute('flex', '1');
      frame.setAttribute('transparent', 'transparent');
      xulPanel.appendChild(frame);
      document.getElementById("mainPopupSet").appendChild(xulPanel);
    }
    let { width, height } = this, when = 'before_start', x, y;
    // Open the popup by the anchor.
    // TODO: make the XUL panel an arrow panel so it gets positioned
    // automagically once arrow panels are implemented in bug 554937.
    if (!anchor) {
      // Open the popup in the middle of the window.
      x = document.documentElement.clientWidth / 2 - width / 2;
      y = document.documentElement.clientHeight / 2 - height / 2;
      when = null;
    }
    xulPanel.sizeTo(width, height);
    xulPanel.openPopup(anchor, when, x, y);
    return this._public;
  },
  /* Public API: Panel.hide */
  hide: function hide() {
    if (!PanelRegistry.has(this))
      throw new Error(ERR_ADD);

    // The popuphiding handler takes care of swapping back the frame loaders
    // and removing the XUL panel from the application window, we just have to
    // trigger it by hiding the popup.
    // XXX Sometimes I get "TypeError: xulPanel.hidePopup is not a function"
    // when quitting the host application while a panel is visible.  To suppress
    // them, this now checks for "hidePopup" in xulPanel before calling it.
    // It's not clear if there's an actual issue or the error is just normal.
    let xulPanel = this._xulPanel;
    if (xulPanel && "hidePopup" in xulPanel)
      xulPanel.hidePopup();
    return this._public;
  },
  
  /* Public API: Panel.resize */
  resize: function resize(width, height) {
    this.width = width;
    this.height = height;
    this._xulPanel.sizeTo(width, height);
  },
  
  // While the panel is visible, this is the XUL <panel> we use to display it.
  // Otherwise, it's null.
  // While the panel is visible, this is the XUL <panel> we use to display it.
  // Otherwise, it's null.
  get _xulPanel() this.__xulPanel,
  set _xulPanel(value) {
    let xulPanel = this.__xulPanel;
    if (value === xulPanel) return;
    if (xulPanel) {
      xulPanel.removeEventListener(ON_HIDE, this._onHide, false);
      xulPanel.removeEventListener(ON_SHOW, this._onShow, false);
      xulPanel.parentNode.removeChild(xulPanel);
    }
    if (value) {
      value.addEventListener(ON_HIDE, this._onHide, false);
      value.addEventListener(ON_SHOW, this._onShow, false);
    }
    this.__xulPanel = value;
  },
  __xulPanel: null,
  get _viewFrame() this.__xulPanel.children[0], 
  /**
   * When the XUL panel becomes hidden, we swap frame loaders back to move
   * the content of the panel to the hidden frame & remove panel element.
   */
  _onHide: function _onHide() {
    try {
      this._frameLoadersSwapped = false;
      this._xulPanel = null;
      this._emit('hide', this._public);
    } catch(e) {
      this._emit('error', e);
    }
  },
  /**
   * When the XUL panel becomes shown, we swap frame loaders between panel
   * frame and hidden frame to preserve state of the content dom.
   */
  _onShow: function _onShow() {
    try {
      if (!this._inited) // defer if not initialized yet
        return this.on('inited', this._onShow.bind(this));
      this._frameLoadersSwapped = true;
      this._emit('show', this._public);
    } catch(e) {
      this._emit('error', e);
    }
  },
  /**
   * Notification that panel was added.
   */
  _onAdd: function _onAdd(self) {
    if (self == this._public && this._inited)
      this._onInit();
  },
  /**
   * Notification that panel was removed.
   */
  _onRemove: function _onRemove(self) {
    if (self == this._public)
        this.hide();
  },
  /**
   * Notification that panel was fully initialized.
   * This will be called another time when panel was added if it
   * was initialized before.
   */
  _onInit: function _onInit() {
    this._inited = true;
    if (PanelRegistry.has(this)) {
      // perform all deferred tasks like initSymbiont, show, hide ...
      this._emit('inited');
      this._removeAllListeners('inited');
    }
  }
});
exports.Panel = function(options) Panel(options)
exports.Panel.prototype = Panel.prototype;

const PanelRegistry = Registry(Panel);

exports.add = PanelRegistry.add;
exports.remove = PanelRegistry.remove;

function getWindow(anchor) {
  let window;

  if (anchor) {
    let anchorWindow = anchor.ownerDocument.defaultView.top;
    let anchorDocument = anchorWindow.document;

    let enumerator = windowMediator.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
      let enumWindow = enumerator.getNext();

      // Check if the anchor is in this browser window.
      if (enumWindow == anchorWindow) {
        window = anchorWindow;
        break;
      }

      // Check if the anchor is in a browser tab in this browser window.
      let browser = enumWindow.gBrowser.getBrowserForDocument(anchorDocument);
      if (browser) {
        window = enumWindow;
        break;
      }

      // Look in other subdocuments (sidebar, etc.)?
    }
  }

  // If we didn't find the anchor's window (or we have no anchor),
  // return the most recent browser window.
  if (!window)
    window = windowMediator.getMostRecentWindow("navigator:browser");

  return window;
}

