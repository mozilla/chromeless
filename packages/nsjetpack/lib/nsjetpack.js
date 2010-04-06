var url = require("url");
var xpcom = require("xpcom");

var component = null;

exports.get = function get() {
  if (!component) {
    var path = url.toFilename(url.resolve(__url__, "platform"));
    xpcom.autoRegister(path);

    var factory = xpcom.getClass("@labs.mozilla.com/jetpackdi;1",
                                 Ci.nsIFactory);
    var nsJetpack = factory.createInstance(null, Ci.nsISupports);
    component = nsJetpack.get();
  }
  return component;
};
