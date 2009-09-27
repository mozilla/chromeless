var ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);

var resolve = exports.resolve = function resolve(base, relative) {
  try {
    var baseURI = ios.newURI(base, null, null);
  } catch (e if e.result == Cr.NS_ERROR_MALFORMED_URI) {
    throw new Error("malformed URI: " + base);
  }
  return ios.newURI(relative, null, baseURI).spec;
};
