var ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);

function newURI(uriStr) {
  try {
    return ios.newURI(uriStr, null, null);
  } catch (e if e.result == Cr.NS_ERROR_MALFORMED_URI) {
    throw new Error("malformed URI: " + uriStr);
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {
    throw new Error("invalid URI: " + uriStr);
  }
}

var parse = exports.parse = function parse(url) {
  var uri = newURI(url);

  var userPass = null;
  try {
    userPass = uri.userPass ? uri.userPass : null;
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {}

  var host = null;
  try {
    host = uri.host;
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {}

  var port = null;
  try {
    port = uri.port == -1 ? null : uri.port;
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {}

  return {scheme: uri.scheme,
          userPass: userPass,
          host: host,
          port: port,
          path: uri.path};
};

var resolve = exports.resolve = function resolve(base, relative) {
  var baseURI = newURI(base);
  return ios.newURI(relative, null, baseURI).spec;
};
