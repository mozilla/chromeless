var ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);

var resolve = exports.resolve = function resolve(base, relative) {
  var baseURI = ios.newURI(base, null, null);
  return ios.newURI(relative, null, baseURI).spec;
};
