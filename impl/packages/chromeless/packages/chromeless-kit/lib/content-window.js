let {Cc, Ci} = require("chrome");

var xpcom = require("xpcom");

var xulNs = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var blankXul = ('<?xml version="1.0"?>' +
                '<?xml-stylesheet href="chrome://global/skin/"  ' +
                '                 type="text/css"?>' +
                '<window xmlns="' + xulNs + '">' +
                '</window>');

function Injector(browser, onStartLoad) {
  memory.track(this);

  browser.addProgressListener(this,
                              Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
  this._onStartLoad = onStartLoad;
}

Injector.prototype = {
  QueryInterface : xpcom.utils.generateQI([Ci.nsIWebProgressListener,
                                           Ci.nsISupportsWeakReference]),

  // Taken from Firebug's content/firebug/tabWatcher.js.
  _safeGetName: function(request) {
    try {
      return request.name;
    } catch (exc) {
      return null;
    }
  },

  // Much of this is taken from Firebug's content/firebug/tabWatcher.js,
  // specifically the FrameProgressListener object.
  onStateChange : function (aWebProgress, aRequest,
                            aStateFlags,  aStatus) {
    if (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_REQUEST) {
      // We need to get the hook in as soon as the new DOMWindow is
      // created, but before it starts executing any scripts in the
      // page.  After lengthy analysis, it seems that the start of
      // these "dummy" requests is the only state that works.

      // TODO: Firebug's code mentions that XHTML doesn't dispatch
      // any of these dummy requests, so we should probably use the
      // Firebug's XHTML workaround here.
      var safeName = this._safeGetName(aRequest);
      var window = aWebProgress.DOMWindow;
      if (window && window.wrappedJSObject &&
          (safeName == "about:layout-dummy-request" ||
           safeName == "about:document-onload-blocker")) {
        // TODO: Firebug's code mentions that about:blank causes strange
        // behavior here; I don't think it should apply to our use case,
        // though.

        try {
          this._onStartLoad.call(undefined, window);
        } catch (e) {
          console.exception(e);
        }
      }
    }
  },

  // Stubs for the nsIWebProgressListener interfaces which we don't use.
  onProgressChange : function() { },
  onLocationChange : function() { },
  onStatusChange   : function() { },
  onSecurityChange : function() { }
};

var windows = [];

function Window(options) {
  memory.track(this);

  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);
  var url = "data:application/vnd.mozilla.xul+xml," + escape(blankXul);

  var features = ["chrome",
                  "width=" + options.width,
                  "height=" + options.height,
                  "centerscreen"];

  if (options.titleBar == false)
    features.push("titlebar=no");

  var window = ww.openWindow(null, url, null, features.join(","), null);
  //var window = ww.openWindow(null, options.url, null, features.join(","), null);

  this._id = windows.push(this) - 1;
  this._window = window;
  this._browser = null;
  this._injector = null;
  this.options = options;

  window.addEventListener("close", this, false);
  window.addEventListener("DOMContentLoaded", this, false);
}

Window.prototype = {
  handleEvent: function handleEvent(event) {
    switch (event.type) {
    case "close":
      if (event.target == this._window) {
        if (windows[this._id])
          delete windows[this._id];
        this._window.removeEventListener("close", this, false);
      }
      break;
    case "DOMContentLoaded":
      if (event.target == this._window.document) {
        this._window.removeEventListener("DOMContentLoaded", this, false);
        this._makeBrowser(event.target);
      }
      break;
    }
  },
  _makeBrowser: function(doc) {
    var browser = doc.createElement("browser");
    browser.setAttribute("disablehistory", "indeed");
    browser.setAttribute("type", "content");
    browser.setAttribute("flex", "1");
    doc.documentElement.appendChild(browser);
    this._browser = browser;
    if (this.options.onStartLoad)
      this._injector = new Injector(browser,
                                    this.options.onStartLoad);
    browser.loadURI(this.options.url);
  },
  get contentWindow() {
    if (this._browser && this._browser.contentWindow)
      return this._browser.contentWindow;
    return null;
  },
  close: function() {
    this._window.close();
  }
};

require("errors").catchAndLogProps(Window.prototype, "handleEvent");

exports.Window = Window;

require("unload").when(
  function() {
    windows.slice().forEach(function(window) { window.close(); });
  });
