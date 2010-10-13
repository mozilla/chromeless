var traceback = require("traceback");
var xpcom = require("xpcom");
var {Cc,Ci,Cm,Cr} = require("chrome");

exports.testRegister = function(test, text) {
  if (!text)
    text = "hai2u";

  function Component() {}

  Component.prototype = {
    newChannel : function(aURI) {
      var ios = Cc["@mozilla.org/network/io-service;1"].
                getService(Ci.nsIIOService);

      var channel = ios.newChannel(
        "data:text/plain," + text,
        null,
        null
      );

      channel.originalURI = aURI;
      return channel;
    },
    getURIFlags: function(aURI) {
        return Ci.nsIAboutModule.ALLOW_SCRIPT;
    },
    QueryInterface: xpcom.utils.generateQI([Ci.nsIAboutModule])
  };

  var contractID = "@mozilla.org/network/protocol/about;1?what=boop";

  var factory = xpcom.register({name: "test about:boop page",
                                contractID: contractID,
                                create: Component});

  var manager = Cm.QueryInterface(Ci.nsIComponentRegistrar);
  test.assertEqual(manager.isCIDRegistered(factory.uuid), true);

  // We don't want to use Cc[contractID] here because it's immutable,
  // so it can't accept updated versions of a contractID during the
  // same application session.
  var aboutFactory = xpcom.getClass(contractID, Ci.nsIFactory);

  test.assertNotEqual(aboutFactory.wrappedJSObject,
                      undefined,
                      "Factory wrappedJSObject should exist.");

  var about = aboutFactory.createInstance(null, Ci.nsIAboutModule);
  var ios = Cc["@mozilla.org/network/io-service;1"].
            getService(Ci.nsIIOService);
  test.assertEqual(
    about.getURIFlags(ios.newURI("http://foo.com", null, null)),
    Ci.nsIAboutModule.ALLOW_SCRIPT
  );

  var aboutURI = ios.newURI("about:boop", null, null);
  var channel = ios.newChannelFromURI(aboutURI);
  var iStream = channel.open();
  var siStream = Cc['@mozilla.org/scriptableinputstream;1']
                 .createInstance(Ci.nsIScriptableInputStream);
  siStream.init(iStream);
  var data = new String();
  data += siStream.read(-1);
  siStream.close();
  iStream.close();
  test.assertEqual(data, text);

  factory.unregister();
  test.assertEqual(manager.isCIDRegistered(factory.uuid), false);
};

exports.testReRegister = function(test) {
  exports.testRegister(test, "hai2u again");
};

exports.testMakeUuid = function(test) {
  var first = xpcom.makeUuid().toString();
  var second = xpcom.makeUuid().toString();
  test.assertMatches(first, /{[0-9a-f\-]+}/);
  test.assertMatches(second, /{[0-9a-f\-]+}/);
  test.assertNotEqual(first, second);
};

exports.testFriendlyError = function (test) {
  // First test that Error objects are returned for all inputs and those Errors
  // have tracebacks.
  var err = xpcom.friendlyError(Cr.NS_ERROR_UNEXPECTED);
  test.assertEqual(err.constructor.name, "Error",
                   "Friendly error on Components.results input should be an " +
                   "Error object");
  var tb = traceback.fromException(err);
  test.assert(tb.length > 1,
              "Friendly error on Components.results input should have " +
              "traceback");

  err = xpcom.friendlyError(new Error());
  test.assertEqual(err.constructor.name, "Error",
                   "Friendly error on Error input should be an Error object");
  tb = traceback.fromException(err);
  test.assert(tb.length > 1,
              "Friendly error on Error input should have traceback");

  try {
    // Is there a better way to generate an nsIException?  Anyway, this works.
    Cc["@mozilla.org/network/io-service;1"].getService(null);
    test.fail("Tried to generate an nsIException but failed!");
  }
  catch (nsIErr) {
    err = xpcom.friendlyError(nsIErr);
    test.assertEqual(err.constructor.name, "Error",
                     "Friendly error on nsIException input should be an " +
                     "Error object");
    tb = traceback.fromException(err);
    test.assert(tb.length > 1,
                "Friendly error on nsIException input should have traceback");
  }

  // Test the messages of all the errors that friendlyError supports.
  var unknownFilename = "(filename unknown)";

  test.assertEqual(xpcom.friendlyError(Cr.NS_BASE_STREAM_CLOSED).message,
                   "The stream is closed and cannot be read or written.",
                   "Cr.NS_BASE_STREAM_CLOSED message expected");

  test.assertEqual(xpcom.friendlyError(Cr.NS_ERROR_FILE_IS_DIRECTORY).message,
                   "The stream was opened on a directory, which cannot " +
                     "be read or written: " + unknownFilename,
                   "Cr.NS_ERROR_FILE_IS_DIRECTORY message expected");
  test.assertEqual(
    xpcom.friendlyError(Cr.NS_ERROR_FILE_IS_DIRECTORY, {
      filename: "some/filename"
    }).message,
    "The stream was opened on a directory, which cannot be read or written: " +
      "some/filename",
    "Cr.NS_ERROR_FILE_IS_DIRECTORY message with filename expected"
  );

  test.assertEqual(xpcom.friendlyError(Cr.NS_ERROR_FILE_NOT_FOUND).message,
                   "path does not exist: " + unknownFilename,
                   "Cr.NS_ERROR_FILE_NOT_FOUND message expected");
  test.assertEqual(
    xpcom.friendlyError(Cr.NS_ERROR_FILE_NOT_FOUND, {
      filename: "some/filename"
    }).message,
    "path does not exist: some/filename",
    "Cr.NS_ERROR_FILE_NOT_FOUND message with filename expected"
  );
};

exports.testUnload = function(test) {
  var loader = new test.makeSandboxedLoader();
  var sbxpcom = loader.require("xpcom");

  function Component() {}

  Component.prototype = {
    QueryInterface: sbxpcom.utils.generateQI([Ci.nsISupports])
  };

  var contractID = "@mozilla.org/blargle;1";
  var factory = sbxpcom.register({name: "test component",
                                  contractID: contractID,
                                  create: Component});

  var manager = Cm.QueryInterface(Ci.nsIComponentRegistrar);
  test.assertEqual(manager.isCIDRegistered(factory.uuid), true);

  loader.unload();

  test.assertEqual(manager.isCIDRegistered(factory.uuid), false);
};
