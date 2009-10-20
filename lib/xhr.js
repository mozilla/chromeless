var requests = [];
var requestCount = 0;

const TERMINATE_EVENTS = ["load", "error", "abort"];

const READ_ONLY_PROPS = ["readyState", "responseText", "responseXML",
                         "status", "statusText"];

const DELEGATED_METHODS = ["abort", "getAllResponseHeaders",
                           "getResponseHeader", "overrideMimeType",
                           "send", "sendAsBinary", "setRequestHeader",
                           "open"];

var getRequestCount = exports.getRequestCount = function getRequestCount() {
  return requestCount;
};

var XMLHttpRequest = exports.XMLHttpRequest = function XMLHttpRequest() {
  var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Ci.nsIXMLHttpRequest);
  req.mozBackgroundRequest = true;

  this._req = req;
  this._id = requests.push(this) - 1;
  requestCount++;
  this._orsc = null;

  var self = this;

  this._boundCleanup = function _boundCleanup() {
    self._cleanup();
  };

  TERMINATE_EVENTS.forEach(
    function(name) {
      self._req.addEventListener(name, self._boundCleanup, false);
    });
};

XMLHttpRequest.prototype = {
  _cleanup: function _cleanup() {
    this.onreadystatechange = null;
    if (requests[this._id]) {
      var self = this;
      TERMINATE_EVENTS.forEach(
        function(name) {
          self._req.removeEventListener(name, self._boundCleanup, false);
        });
      requests[this._id] = null;
      requestCount--;
    }
  },
  _unload: function _unload() {
    this._req.abort();
    this._cleanup();
  },
  addEventListener: function addEventListener() {
    throw new Error("not implemented");
  },
  removeEventListener: function removeEventListener() {
    throw new Error("not implemented");
  },
  get upload() {
    throw new Error("not implemented");
  },
  get onreadystatechange() {
    return this._orsc;
  },
  set onreadystatechange(cb) {
    this._orsc = cb;
    if (cb) {
      var self = this;
      this._req.onreadystatechange = function() {
        try {
          self._orsc.apply(self, arguments);
        } catch (e) {
          console.exception(e);
        }
      };
    }
  }
};

READ_ONLY_PROPS.forEach(
   function(name) {
     XMLHttpRequest.prototype.__defineGetter__(
       name,
       function() {
         return this._req[name];
       });
   });

DELEGATED_METHODS.forEach(
  function(name) {
    XMLHttpRequest.prototype[name] = function() {
      this._req[name].apply(this._req, arguments);
    };
  });

require("unload").when(
  function() {
    requests.slice().forEach(
      function(request) {
        if (request)
          request._unload();
      });
  });
