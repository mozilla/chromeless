var jsm = {};
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm", jsm);
var utils = exports.utils = jsm.XPCOMUtils;

var manager = Components.manager;
manager.QueryInterface(Ci.nsIComponentRegistrar);

var factories = [];

function Factory(options) {
  this.create = options.create;
  this.uuid = options.uuid;
  this.name = options.name;
  this.contractID = options.contractID;

  manager.registerFactory(this.uuid,
                          this.name,
                          this.contractID,
                          this);
  factories.push(this);
}

Factory.prototype = {
  createInstance: function(outer, iid) {
    try {
      if (outer)
        throw Cr.NS_ERROR_NO_AGGREGATION;
      return (new this.create()).QueryInterface(iid);
    } catch (e) {
      console.exception(e);
      if (e instanceof Ci.nsIException)
        throw e;
      else
        throw Cr.NS_ERROR_FAILURE;
    }
  },
  unregister: function() {
    var index = factories.indexOf(this);
    if (index == -1)
      throw new Error("factory already unregistered");
    factories.splice(index, 1);
    manager.unregisterFactory(this.uuid, this);
  },
  QueryInterface: utils.generateQI([Ci.nsIFactory])
};

var makeUuid = exports.makeUuid = function makeUuid() {
  var uuidGenerator = Cc["@mozilla.org/uuid-generator;1"]
                      .getService(Ci.nsIUUIDGenerator);
  var uuid = uuidGenerator.generateUUID();
  return uuid;
};

var register = exports.register = function register(options) {
  options = {__proto__: options};
  if (!options.uuid)
    options.uuid = makeUuid();
  return new Factory(options);
};

var getClass = exports.getClass = function getClass(contractID, iid) {
  if (!iid)
    iid = Ci.nsISupports;
  return Components.manager.getClassObjectByContractID(contractID,
                                                       iid);
};

require("unload").when(
  function() {
    var copy = factories.splice();
    copy.reverse();
    copy.forEach(function(factory) { factory.unregister(); });
  });
