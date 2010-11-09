var url = require("url");
var xpcom = require("xpcom");
var {Ci} = require("chrome");

var component = null;

exports.get = function get() {
  if (!component) {
    var path = url.toFilename(url.URL("platform", __url__).toString());
    xpcom.autoRegister(path);

    var factory = xpcom.getClass("@labs.mozilla.com/jetpackdi;1",
                                 Ci.nsIFactory);
    var nsJetpack = factory.createInstance(null, Ci.nsISupports);
    component = nsJetpack.get();
  }
  return component;
};
