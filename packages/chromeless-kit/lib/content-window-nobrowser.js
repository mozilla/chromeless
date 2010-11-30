let {Cc, Ci} = require("chrome");

var windows = [];

function Window(options) {
  memory.track(this);

  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);

  var features = ["",
                  "width=" + options.width,
                  "height=" + options.height,
                  "centerscreen"];

  if (options.titleBar == false)
    features.push("titlebar=no");

  /* We now pass the options.url, which is the user app directly 
  inserting it in the window, instead using the xul browser element 
  that was here. This helped to make the session history work. 
  */

  var window = ww.openWindow(null, options.url, null, features.join(","), null);

  this._id = windows.push(this) - 1;
  this._window = window;
  this._browser = null;
  this._injector = null;
  this.options = options;

  window.addEventListener("close", this, false);

  this.options.onStartLoad.call(undefined, window);
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
    }
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
