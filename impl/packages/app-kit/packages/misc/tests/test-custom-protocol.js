var customProtocol = require("custom-protocol");
var xhr = require("xhr");
var xpcom = require("xpcom");

var ios = Cc["@mozilla.org/network/io-service;1"].
          getService(Ci.nsIIOService);

var systemPrincipal = Cc["@mozilla.org/systemprincipal;1"]
                      .createInstance(Ci.nsIPrincipal);

exports.testProtocolsCannotBeOverwritten = function(test) {
  var boop = new customProtocol.Protocol("blargh");

  test.assertRaises(
    function() { return new customProtocol.Protocol("blargh"); },
    "protocol already registered: blargh",
    "Registering an already-registered protocol should raise error."
  );
};

exports.testNewChannel = function(test) {
  var prot = new customProtocol.Protocol("testblarg");
  prot.setHost("boop", "data:text/plain,this is my protocol.");

  var uri = ios.newURI("testblarg://boop/", null, null);
  var channel = ios.newChannelFromURI(uri);
  var iStream = channel.open();
  var siStream = Cc['@mozilla.org/scriptableinputstream;1']
                 .createInstance(Ci.nsIScriptableInputStream);
  siStream.init(iStream);
  var data = new String();
  data += siStream.read(-1);
  siStream.close();
  iStream.close();
  test.assertEqual(data, "this is my protocol.",
                   "Data can be read from a stream.");
  test.assert(!channel.owner.equals(systemPrincipal),
              "default principal is not system.");

  prot.setHost("voop", "data:text/plain,blah.", "system");
  uri = ios.newURI("testblarg://voop/", null, null);
  channel = ios.newChannelFromURI(uri);
  test.assert(channel.owner.equals(systemPrincipal),
              "principal can be set to system.");

  test.assertRaises(
    function() prot.setHost("voop", "data:text/plain,blah.", "u"),
    "invalid principal: u",
    "Error should be raised on invalid principal."
  );

  uri = ios.newURI("testblarg://nothing/", null, null);
  try {
    channel = ios.newChannelFromURI(uri);
    test.fail("Opening nonexistent host should raise error.");
  } catch (e if e.result == Cr.NS_ERROR_FILE_NOT_FOUND) {
    test.pass("Opening nonexistent host should raise error.");
  }

  prot.unload();
};

exports.testNewURI = function(test) {
  var prot = new customProtocol.Protocol("testblarg");
  var uri = ios.newURI("testblarg://boop/goop/", null, null);
  test.assertEqual(uri.spec, "testblarg://boop/goop/",
                   "uri.spec is as expected.");
  test.assertEqual(uri.scheme, "testblarg",
                   "uri.scheme is as expected.");
  test.assertEqual(uri.host, "boop",
                   "uri.host is as expected.");
  test.assertEqual(uri.path, "/goop/",
                   "uri.path is as expected.");
  test.assertEqual(uri.port, -1,
                   "uri.port is as expected.");

  var reluri = ios.newURI("shoop", null, uri);
  test.assertEqual(reluri.spec, "testblarg://boop/goop/shoop",
                   "relative URIs behave as expected.");
  prot.unload();
};

exports.testXHR = function(test) {
  var prot = new customProtocol.Protocol("testblarg");
  prot.setHost("foo", "data:text/plain,hai2u");
  var req = new xhr.XMLHttpRequest();
  req.open("GET", "testblarg://foo", false);
  req.send(null);
  test.assertEqual(req.responseText, "hai2u",
                   "XMLHttpRequests work.");
  prot.unload();
};
