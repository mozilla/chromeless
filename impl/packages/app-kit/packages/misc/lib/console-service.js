let {Cc, Ci} = require("chrome");

var cService = Cc['@mozilla.org/consoleservice;1'].getService()
               .QueryInterface(Ci.nsIConsoleService);

function Listener(cb) {
  this._cb = cb;
  cService.registerListener(this);
}

Listener.prototype = {
  remove: function() {
    cService.unregisterListener(this);
  },
  observe: function(object) {
    var newObj = new Object();
    try {
      var scriptError = object.QueryInterface(Ci.nsIScriptError);
      newObj.isWarning = (scriptError.flags &
                          Ci.nsIScriptError.warningFlag) != 0;
      newObj.isStrictWarning = (scriptError.flags &
                                Ci.nsIScriptError.strictFlag) != 0;
      newObj.isException = (scriptError.flags &
                            Ci.nsIScriptError.exceptionFlag) != 0;
      newObj.isError = (!(newObj.isWarning || newObj.isStrictWarning));
      newObj.message = scriptError.errorMessage;
      ["category", "lineNumber", "sourceName", "sourceLine",
       "columnNumber"].forEach(
         function(propName) {
           newObj[propName] = scriptError[propName];
         });
    } catch (e) {
      try {
        newObj.message = object.QueryInterface(Ci.nsIConsoleMessage)
                         .message;
      } catch (e) {
        newObj.message = object.toString();
      }
    }
    try {
      this._cb.call(undefined, newObj);
    } catch (e) {
      console.exception(e);
    }
  }
};

var listeners = [];

exports.addListener = function addListener(cb) {
  listeners.push(new Listener(cb));
};

require("unload").when(
  function() {
    listeners.forEach(
      function(listener) {
        listener.remove();
      });
    listeners = [];
  });
