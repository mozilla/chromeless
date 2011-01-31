let {Cc, Ci} = require("chrome");

var gWindows = [];

const xpcom = require("xpcom");

const ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);

observers = require("observer-service");

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
      // generate a custom event to indicate to top level HTML
      // that the initial page load is complete (no scripts yet exectued)
      var evt = subject.window.parent.document.createEvent("HTMLEvents");  
      evt.initEvent("experimental-dom-load", true, false);
      // XXX: this ad-hoc data isn't making it from chrome (us)
      // to content (browser HTML) in 2.0b8pre.  is that a
      // regression in gecko or a security feature?
      evt.wrappedJSObject.url = subject.window.location.href;
      //evt.window = subject.window;

      // This is a proposal for us to send the experimental-dom 
      // event to the window instead the parent window. This would 
      // allow us to capture the event from the upper iframe,
      // which facilitates to keep track of what iframe content 
      // was updated - helps with multi browser application case  
      subject.window.parent.dispatchEvent(evt);
      //subject.window.dispatchEvent(evt);

      // this is a top level iframe
      subject.window.wrappedJSObject.top = subject.window.self;
      subject.window.wrappedJSObject.parent = subject.window.self;
    }
    else
    {
      // this is a frame nested underneat the top level frame
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

var blankXul = ('<?xml version="1.0"?>' +
                '<?xml-stylesheet ' +
                ' type="text/css"?> ' +
                '<window style="padding: 0; border: 0; margin: 0; background-color:transparent;" xmlns:html="'+ xhtmlNs+'" xmlns="' + xulNs + '">' +
                '<toolbox style="padding: 0; border: 0; margin: 0;">' +
                '<menubar id="theMenuBar" style="padding: 0; border: 0; margin: 0;">' +
                '</menubar>' +
                '</toolbox>' +
                '</window>');


function Window(options) {
  memory.track(this);

  var features = ["width=" + options.width,
                  "height=" + options.height,
                  "menubar=yes",
                  "resizable=yes",
                  "centerscreen=yes"
                 ];

  if (options.titleBar == false) features.push("titlebar=no");

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
