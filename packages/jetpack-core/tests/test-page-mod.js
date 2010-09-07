var pageMod = require("page-mod");
var testPageMod = require("pagemod-test-helpers").testPageMod;

/* XXX This can be used to delay closing the test Firefox instance for interactive
 * testing or visual inspection. This test is registered first so that it runs
 * the last. */
exports.delay = function(test) {
  if (false) {
    test.waitUntilDone(60000);
    require("timer").setTimeout(function() {test.done();}, 4000);
  } else
    test.pass();
}

/* Tests for the PageMod APIs */

exports.testPageMod1 = function(test) {
  testPageMod(test, "about:", [{
      include: "about:*",
      onReady: function(wrappedWindow) {
        wrappedWindow.document.body.setAttribute("JEP-107", "worked");
      }
    }],
    function(win) {
      test.assertEqual(win.document.body.getAttribute("JEP-107"),
                       "worked", "PageMod.onReady test");
    });
};

exports.testPageMod2 = function(test) {
  testPageMod(test, "about:", [{
      include: "about:*",
      "onStart": [function(wrappedWindow) {
        wrappedWindow.AUQLUE = function() { return 42; }
      },
      function(wrappedWindow) {
        test.assertEqual(wrappedWindow.AUQLUE(), 42,
                         "PageMod scripts executed in order");
        wrappedWindow.wrappedJSObject.test = true;
      }]
    }], function(win) {
      test.assertEqual(win.AUQLUE(), 42, "PageMod test #2: first script has run");
      test.assertEqual(win.wrappedJSObject.test, true, "PageMod test #2: second script has run");
      test.assertEqual("AUQLUE" in win.wrappedJSObject, false,
                       "PageMod test #2: scripts get a wrapped window");
    });
};

exports.testPageModIncludes = function(test) {
  var asserts = [];
  function createPageModTest(include, expectedMatch) {
    // Create an 'onload' test function...
    asserts.push(function(test, win) {
      var matches = include in win;
      test.assert(expectedMatch ? matches : !matches,
                  "'" + include + "' match test, expected: " + expectedMatch);
    });
    // ...and corresponding PageMod options
    return {
      "include": include,
      "onStart": function(wrappedWindow) {
        wrappedWindow[include] = true;
      }
    };
  }

  testPageMod(test, "about:buildconfig", [
      createPageModTest("*", false),
      createPageModTest("*.google.com", false),
      createPageModTest("about:*", true),
      createPageModTest("about:", false),
      createPageModTest("about:buildconfig", true)
    ],
    function(win) {
      asserts.forEach(function(fn) {
        fn(test, win);
      })
    });
};

exports.testPageModErrorHandling = function(test) {
  test.assertRaises(function() {
      new pageMod.PageMod({onStart: function() {}});
    },
    /include/,
    "PageMod() throws when 'include' option is not specified.");

  test.assertRaises(function() {
      new pageMod.PageMod({include: "*", onStart: ""});
    },
    /onStart/,
    "PageMod() throws when 'onStart' option is a string.");

  test.assertRaises(function() {
      new pageMod.PageMod({include: "*", onStart: [""]});
    },
    /onStart.*not a function/,
    "PageMod() throws when 'onStart' option is a [''].");

  test.assertRaises(function() {
      pageMod.add({desc: "This is not an instance of PageMod"});
    },
    "Trying to add an object that's not a PageMod instance.",
    "add() throws when given a non-PageMod object.")

  test.assertRaises(function() {
      pageMod.remove(new pageMod.PageMod({include:"*"}));
    },
    "Trying to remove a page mod, that has not been added.",
    "remove() throws when removing an object that has not been added.")
};

/* Tests for internal functions. */
exports.testParseURLRule = function(test) {
  let loader = test.makeSandboxedLoader();
  let pageMod = loader.require("page-mod");
  let parseURLRule = loader.findSandboxForModule("page-mod").
                            globalScope.parseURLRule;

  test.assertRaises(function() {
      parseURLRule("*.google.com/*");
    },
    /There can be at most one/,
    "parseURLRule throws when supplied multiple '*'");

  test.assertRaises(function() {
      parseURLRule("google.com");
    },
    /expected to be either an exact URL/,
    "parseURLRule throws when the wildcard doesn't use '*' and doesn't " +
    "look like a URL");

  test.assertRaises(function() {
      parseURLRule("http://google*.com");
    },
    /expected to be the first or the last/,
    "parseURLRule throws when a '*' is in the middle of the wildcard");

  test.assertEqual(
    parseURLRule("http://google.com/test").exactURL,
    "http://google.com/test"
  );

  test.assertEqual(
    parseURLRule("http://google.com/test/*").urlPrefix,
    "http://google.com/test/"
  );

  test.assertEqual(
    parseURLRule("*.example.com").domain,
    "example.com"
  );
};

exports.testRulesMatchURL = function(test) {
  let loader = test.makeSandboxedLoader();
  let pageMod = loader.require("page-mod");
  let rulesMatchURL = loader.findSandboxForModule("page-mod").
                             globalScope.pageModManager._rulesMatchURL;

  test.assert(rulesMatchURL([{anyWebPage: true}], {protocol:"http:"}),
              "anyWebPage rule matches a http-scheme location");
  test.assert(rulesMatchURL([{anyWebPage: true}], {protocol:"https:"}),
              "anyWebPage rule matches a https-scheme location");
  test.assert(rulesMatchURL([{anyWebPage: true}], {protocol:"ftp:"}),
              "anyWebPage rule matches a ftp-scheme location");
  test.assert(!rulesMatchURL([{anyWebPage: true}], {protocol:"chrome:"}),
              "anyWebPage rule doesn't match a chrome:// location");
  test.assert(rulesMatchURL([{exactURL: "test"}], "test"),
              "exactURL rule test #1");
  test.assert(!rulesMatchURL([{exactURL: "test"}], "test2"),
              "exactURL rule test #2");
  test.assert(rulesMatchURL([{urlPrefix: "http://example.com/"}],
                            "http://example.com/suffix"),
              "urlPrefix test #1");
  test.assert(!rulesMatchURL([{urlPrefix: "http://example.com/"}],
                            "http://example.org/"),
              "urlPrefix test #2");
  test.assert(rulesMatchURL([{domain: "example.com"}],
                            {hostname: "example.com"}),
              "domain rule exact match");
  test.assert(rulesMatchURL([{domain: "example.com"}],
                            {hostname: "subdomain.example.com"}),
              "domain rule subdomain match");
  test.assert(!rulesMatchURL([{domain: "example.com"}],
                            {hostname: "example.org"}),
              "domain rule test #3");
  // location.hostname sometimes throws (for protocols that don't have hosts,
  // e.g. about:, so we should make sure we handle this)
  test.assert(!rulesMatchURL([{domain: "example.com"}],
                            {get hostname() {throw new Error();}}),
              "throwing hostname works fine");
};
