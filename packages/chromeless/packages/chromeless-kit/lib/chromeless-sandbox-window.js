let {Cc, Ci} = require("chrome");

var gWindows = [];

var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);

observers = require("observer-service");

function isTopLevelWindow(w) {
    for (var i = 0; i < gWindows.length; i++) if (w == gWindows[i]._window) return true;
    return false;
}

observers.add("content-document-global-created", function(subject, url) {
    if (subject.window.top != subject.window.self) {
        if (isTopLevelWindow(subject.window.parent))
        {
            // generate a custom event to indicate to top level HTML
            // that the initial page load is complete (no scripts yet exectued)
            var evt = subject.window.parent.document.createEvent("HTMLEvents");  
            evt.initEvent("experimental-dom-loaded", true, false);
            // XXX: this ad-hoc data isn't making it from chrome (us)
            // to content (browser HTML) in 2.0b8pre.  is that a
            // regression in gecko or a security feature?
            evt.url = subject.window.location.href;
            subject.window.parent.dispatchEvent(evt);

            // this is a top level iframe
            subject.window.top = subject.window.self;
            subject.window.parent = subject.window.self;
        }
        else
        {
            // this is a frame nested underneat the top level frame  
            subject.window.top = subject.window.parent.top;
        }
    }
});

function Window(options) {
  memory.track(this);

  var features = ["",
                  "width=" + options.width,
                  "height=" + options.height,
                  "centerscreen"];

  if (options.titleBar == false) features.push("titlebar=no");

  /* We now pass the options.url, which is the user app directly 
  inserting it in the window, instead using the xul browser element 
  that was here. This helped to make the session history work. 
  */

  var window = ww.openWindow(null, options.url, null, features.join(","), null);

  this._id = gWindows.push(this) - 1;
  this._window = window;
  this._browser = null;
  this._injector = null;
  this.options = options;

  window.addEventListener("close", this, false);

  if (this.options.injectProps) {
      for (name in this.options.injectProps) {
          window[name] = this.options.injectProps[name];
      }
  }
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
