var ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);

function newURI(uriStr) {
  try {
    return ios.newURI(uriStr, null, null);
  } catch (e if e.result == Cr.NS_ERROR_MALFORMED_URI) {
    throw new Error("malformed URI: " + uriStr);
  }
}

var resolve = exports.resolve = function resolve(base, relative) {
  var baseURI = newURI(base);
  return ios.newURI(relative, null, baseURI).spec;
};
