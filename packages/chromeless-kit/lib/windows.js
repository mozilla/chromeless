let {Cc, Ci} = require("chrome");

const appinfo = require('appinfo');

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
            evt.initEvent("experimental-dom-load", true, false);
            // XXX: this ad-hoc data isn't making it from chrome (us)
            // to content (browser HTML) in 2.0b8pre.  is that a
            // regression in gecko or a security feature?
            evt.url = subject.window.location.href;
            //evt.window = subject.window;

            // This is a proposal for us to send the experimental-dom 
            // event to the window instead the parent window. This would 
            // allow us to capture the event from the upper iframe,
            // which facilitates to keep track of what iframe content 
            // was updated - helps with multi browser application case  
            subject.window.parent.dispatchEvent(evt);
            //subject.window.dispatchEvent(evt);

            // this is a top level iframe

            subject.window.top = subject.window.self;
            subject.window.parent = subject.window.self;

        }
        else
        {
            // this is a frame nested underneat the top level frame  
            subject.window.top = subject.window.parent.top;
        }
        
        
        // Make target == _top links go to the top frame
        
        subject.document.addEventListener('DOMContentLoaded', function topAs(evt) {
          var as = subject.document.querySelectorAll("a[target=\"_top\"]");
          for(var i = 0; i < as.length; i++) {
            as[i].addEventListener('click', function(e) {
              subject.window.top.location = e.originalTarget.href;
              e.preventDefault();
              return false;
            }, false);
          }

          subject.document.removeEventListener('DOMContentLoaded', topAs, false);
        }, false);
    } else { 



    } 
});

var ai = appinfo.contents;
var base_options = {
  titlebar: true,
  menubar: false,
  resizable: true,
  height: 800,
  width: 600,
  url: "http://google.com",
  injectProps: {
    require: function(moduleName) {
      console.log("browser HTML requires: " + moduleName);
      try {
        return require(moduleName);
      } catch(ex) {
        console.error(ex);
        //throw ex;
      }
    },
    console: console,
    exit: function() {
        console.log("window.exit() called...");
        this.close();
    }
  }
};

function Window(inOptions) {
  var options = base_options, window;for(option in inOptions) {options[option] = inOptions[option];}
  function trueIsYes(bool) {return bool ? 'yes' : 'no';}

  memory.track(this);

  var features = ["",
                  "width=" + options.width,
                  "height=" + options.height,
                  "centerscreen"];

  if (options.titleBar == false) features.push("titlebar=no");
  
  features.push("resizable="+trueIsYes(options.resizable));

  /* We now pass the options.url, which is the user app directly 
  inserting it in the window, instead using the xul browser element 
  that was here. This helped to make the session history work. 
  */

  var window = ww.openWindow(null, options.url, options.name ? options.name : null, features.join(","), null);

  this._id = gWindows.push(this) - 1;
  this._window = window;
  this._browser = null;
  this._injector = null;
  this.options = options;

  window.addEventListener("close", this, false);

  if (this.options.injectProps) {
      for (name in this.options.injectProps) {
          console.log("injecting object into window: " + name);
          window[name] = this.options.injectProps[name];
      }
  }

  window.addEventListener("load", function (e) { 
      e.target.body.addEventListener("DOMNodeInserted",function (e) { 
        if(e.target.nodeName=="IFRAME") { 
           require("iframe-as-browser").bind(e.target,window.document);
        } 
      }, true );
  }, false);

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
    gWindows.slice().forEach(function(window) { window._window.close(); });
  });
