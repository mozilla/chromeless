let {Cc, Ci} = require("chrome");

var gWindows = [];

const xpcom = require("xpcom");
const appinfo = require("appinfo");

const ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);

const observers = require("observer-service");
const iframeProgressHooks = require('iframe-progress-hooks');

function isTopLevelWindow(w) {
  for (var i = 0; i < gWindows.length; i++) {
    if (gWindows[i]._browser.contentWindow == w) return true;
  }
  return false;
}

observers.add("content-document-global-created", function(subject, url) {
  if (subject.window.top != subject.window.self) {
    if (isTopLevelWindow(subject.window.parent))
    {
      // browser code window
      var bcWin = subject.window.parent;
      // top level iframe window
      var ifWin = subject.window.self;

      // generate a custom event to indicate to top level HTML
      // that the initial page load is complete (no scripts yet executed)
      var evt = bcWin.document.createEvent("HTMLEvents");
      evt.initEvent("ChromelessDOMSetup", true, false);

      // dispatch the event on the iframe in question in the context of the
      // parent.  First we have to find the iframe.
      var iframes = bcWin.document.getElementsByTagName("iframe");
      for (var i = 0; i < iframes.length; i++) {
        if(subject.window === iframes[i].contentWindow) {
          iframes[i].dispatchEvent(evt);

          // hookProgress will set up a listener that will
          // relay further iframe progress events to the application
          // code.  Once hooked, an iframe will continue to emit events
          // even when the .src of the iframe changes.  To keep track
          // of whether the iframe has been hooked, we'll hang state
          // off the iframe[i] dom node.  this state *should not* be
          // visibile to app code, because it's not on wrappedJSObject
          if (iframes[i].__chromelessEventsHooked === undefined) {
            iframes[i].__chromelessEventsHooked = true;
            iframeProgressHooks.hookProgress(iframes[i], bcWin.document);
          }
          break;
        }
      }

      // Top level iframes are used to hold web content.  We'll hide from
      // the content of an iframe the fact that it has a parent.
      ifWin.wrappedJSObject.top = ifWin;
      ifWin.wrappedJSObject.parent = ifWin;
    }
    else
    {
      // this is a frame nested underneath the top level frame
      subject.window.wrappedJSObject.top = subject.window.parent.top;
    }
  } 
});


// injector is a little tool to catch the browser code after it is initialized
// but before any javscript runs so we can inject top level functions
function Injector(browser, onStartLoad) {
  browser.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
  this._browser = browser;
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

  remove: function() {
    this._browser.removeProgressListener(this);
  },

  // Much of this is taken from Firebug's content/firebug/tabWatcher.js,
  // specifically the FrameProgressListener object.
  onStateChange : function (aWebProgress, aRequest,
                            aStateFlags, aStatus) {
    if (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_REQUEST) {
      // We need to get the hook in as soon as the new DOMWindow is
      // created, but before it starts executing any scripts in the
      // page. After lengthy analysis, it seems that the start of
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
  onStatusChange : function() { },
  onSecurityChange : function() { }
};

var xulNs = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
var xhtmlNs = "http://www.w3.org/1999/xhtml";
const ai = appinfo.contents;

var menubar = '';
if (typeof(ai.menubar) == "undefined" || ai.menubar == true ) {
   menubar ='<toolbox id="theTopToolbox" style="padding: 0; border: 0; margin: 0;">' +
            '<menubar id="theMenuBar" style="padding: 0; border: 0; margin: 0;">' +
            '</menubar>' +
            '</toolbox>';
}
var blankXul = ('<?xml version="1.0"?>' +
                '<?xml-stylesheet ' +
                ' type="text/css"?> ' +
                '<window style="padding: 0; border: 0; margin: 0; background-color: white;" xmlns:html="'+ xhtmlNs+'" xmlns="' + xulNs + '">' + menubar +
                '</window>');

function Window(options, testCallbacks) {
  memory.track(this);

  function trueIsYes(x) { return x ? "yes" : "no"; }

  var features = ["width=" + options.width,
                  "height=" + options.height,
                  "centerscreen=yes"
                 ];

  if (options.titleBar == false) features.push("titlebar=no");

  features.push("resizable=" + trueIsYes(options.resizable));
  features.push("menubar=" + trueIsYes(options.menubar));

  /* We now pass the options.url, which is the user app directly 
  inserting it in the window, instead using the xul browser element 
  that was here. This helped to make the session history work. 
  */
  var url = "data:application/vnd.mozilla.xul+xml," + escape(blankXul);
  var window = ww.openWindow(null, url, null, features.join(","), null);

  this._id = gWindows.push(this) - 1;
  this._window = window;
  this._browser = null;
  this._injector = null;
  this._testCallbacks = testCallbacks;
  this.options = options;

  window.addEventListener("close", this, false);
  window.addEventListener("DOMContentLoaded", this, false);
}

Window.prototype = {
  handleEvent: function handleEvent(event) {
    switch (event.type) {
    case "close":
      if (event.target == this._window) {
        if (gWindows[this._id])
          delete gWindows[this._id];
        this._window.removeEventListener("close", this, false);
      }
      break;
    case "DOMContentLoaded":
      if (event.target == this._window.document) {
        var browser = this._window.document.createElement("browser");
        browser.setAttribute("id", "main-window");
        browser.setAttribute("disablehistory", "indeed");
        browser.setAttribute("type", "content-primary");
        browser.setAttribute("style", "background:none;background-color:transparent ! important");
        browser.setAttribute("flex", "1");
        browser.setAttribute("height", "100%");
        browser.setAttribute("border", "10px solid green");
        event.target.documentElement.appendChild(browser);

        if (this.options.injectProps) {
          var injectProps = this.options.injectProps;
          var winClass = this;
          this._injector = new Injector(browser, function(w) {
            for (name in injectProps) {
              console.log("injecting object into window: " + name);
              w.wrappedJSObject[name] = injectProps[name];
            }
            // unregister now!
            winClass._injector.remove();
            winClass._injector = null;
          });
        }

        this._browser = browser;
        browser.loadURI(this.options.url);
        if(this._testCallbacks != undefined && this._testCallbacks.onload != undefined) {
           var refthis = this; 
           browser.addEventListener("DOMContentLoaded", function () { 
             refthis._testCallbacks.onload();
           }, false); 
        } 

      }
      return false;
    };
  },
  close: function() {
    this._window.close();
  }
};

require("errors").catchAndLogProps(Window.prototype, "handleEvent");

exports.Window = Window;

require("unload").when(
  function() {
    gWindows.slice().forEach(function(window) { window.close(); });
  });

// an internal export.  what's the proper way to prevent browsercode from
// getting at this?
exports.AllWindows = gWindows;
