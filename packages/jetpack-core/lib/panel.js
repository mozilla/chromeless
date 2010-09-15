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

  _isShown: false,

  _swapFrameLoaders: function _swapFrameLoaders() {
    this._frame.QueryInterface(Ci.nsIFrameLoaderOwner)
      .swapFrameLoaders(this._viewFrame);
  },
  constructor: function Panel(options) {
    this._onShow = this._onShow.bind(this);
    this._onHide = this._onHide.bind(this);
    let { onShow, onHide, width, height, content } = options || (options = {});
    if (onShow)
      this.on('show', onShow);
    if (onHide)
      this.on('hide', onHide);
    if (width)
      this.width = width;
    if (height)
      this.height = height;
    // must throw if no content is specified
    this.content = content;
    this._init(options);
  },
  _destructor: function _destructor() {
    if (PanelRegistry.has(this))
      this.hide();
    this._symbiontDestructor();
    this._removeAllListeners('show');
    this._removeAllListeners('hide');
  },
  get width() this._width,
  set width(value)
    this._width = valid({ $: value }, { $: validNumber }).$ || this._width,
  _width: 320,
  get height() this._height,
  set height(value)
    this._height =  valid({ $: value }, { $: validNumber }).$ || this._height,
  _height: 240,

  show: function show(anchor) {
    // do nothing if already open
    if (!PanelRegistry.has(this))
      throw new Error(ERR_ADD);
    if (this._isShown) return;
    this._isShown = true;
    anchor = anchor || null;

    let document = getWindow(anchor).document;
    let xulPanel = this._xulPanel = document.createElementNS(XUL_NS, 'panel');
    let frame = this._viewFrame = document.createElementNS(XUL_NS, 'iframe');
    frame.setAttribute('type', 'content');
    frame.setAttribute('flex', '1');
    frame.setAttribute('transparent', 'transparent');
    xulPanel.appendChild(frame);
    document.getElementById("mainPopupSet").appendChild(xulPanel);

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

    xulPanel.addEventListener(ON_SHOW, this._onShow, false);
    xulPanel.addEventListener(ON_HIDE, this._onHide, false);
    xulPanel.sizeTo(width, height);
    xulPanel.openPopup(anchor, when, x, y);
  },

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
  },
  // While the panel is visible, this is the XUL <panel> we use to display it.
  // Otherwise, it's null.
  _xulPanel: null,
  /**
   * When the XUL panel becomes hidden, we swap frame loaders to move
   * the content of the panel back to the hidden iframe where it is stored.
   */
  _onHide: function _onHide() {
    this._swapFrameLoaders();
    xulPanel = this._xulPanel;
    xulPanel.removeEventListener("popuphidden", this._onClose, false);
    xulPanel.parentNode.removeChild(xulPanel);
    this._isShown = false;
    this._xulPanel = null;
    this._viewFrame = null;

    this._asyncEmit('hide', this._public);
  },
  _onShow: function _onShow() {
    if (!this._isShown) return;
    let xulPanel = this._xulPanel;
    xulPanel.removeEventListener("popupshown", this._onOpen, false);
    this._swapFrameLoaders();

    this._asyncEmit('show', this._public);
  },
  _onAdd: function _onAdd(self) {
    if (self == this._public)
      this._onInit();
  },
  _onInit: function _onInit() {
    // if not added yet no delay worker global scope creation
    if (!PanelRegistry.has(this))
      return PanelRegistry.on('add', this._onAdd.bind(this));

    this._onSymbiontInit();
    // maybe panel was loaded while frame got ready
    this._onShow();
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

