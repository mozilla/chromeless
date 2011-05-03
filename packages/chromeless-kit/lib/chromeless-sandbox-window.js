const {Cc, Ci, Cu} = require("chrome");

var gWindows = [];

const xpcom = require("xpcom");
const appinfo = require("appinfo");

const ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);

const observers = require("observer-service");

function isTopLevelWindow(w) {
  for (var i = 0; i < gWindows.length; i++) {
    if (gWindows[i]._browser && gWindows[i]._browser.contentWindow == w) return true;
  }
  return false;
}

observers.add("content-document-global-created", function(subject, url) {
  if (subject.window.top != subject.window.self) {
    if (isTopLevelWindow(subject.window.parent))
    {
      // top level iframe window
      var ifWin = subject.window.self;
      ifWin.wrappedJSObject.eval("window.top = window.self");
      ifWin.wrappedJSObject.eval("window.parent = window.self");
    }
    else
    {
      // this is a frame nested underneath the top level frame
      subject.window.wrappedJSObject.top = subject.window.parent.top;
    }
  } else if (isTopLevelWindow(subject.window)) {
      // this is application code!  let's handle injection at this point.
      let i;
      for (i = 0; i < gWindows.length; i++) {
          if (gWindows[i]._browser && gWindows[i]._browser.contentWindow == subject.window) break;
      }
      if (i < gWindows.length) {
          let wo = gWindows[i];
          if (wo.options.injectProps) {
              let sandbox = new Cu.Sandbox(
                  Cc["@mozilla.org/systemprincipal;1"].
                      createInstance(Ci.nsIPrincipal)
              );

              sandbox.window = subject.wrappedJSObject;

              for (var k in wo.options.injectProps) {
                  // functions are easy to inject
                  if (typeof(wo.options.injectProps[k]) === 'function') {
                      sandbox.importFunction(wo.options.injectProps[k], k);
                  }
                  // objects are easy too, just different
                  else {
                      sandbox[k] = wo.options.injectProps[k];
                  }

                  Cu.evalInSandbox("window."+k+" = "+k+";", sandbox);
              }
          }
      }
  }
});

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
