"use strict";

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
      contentScriptWhen: 'ready',
      contentScript: 'new ' + function WorkerScope() {
        window.document.body.setAttribute("JEP-107", "worked");
      }
    }],
    function(win, done) {
      test.assertEqual(
        win.document.body.getAttribute("JEP-107"),
        "worked",
        "PageMod.onReady test"
      );
      done();
    }
  );
};

exports.testPageMod2 = function(test) {
  testPageMod(test, "about:", [{
      include: "about:*",
      contentScript: [
        'new ' + function contentScript() {
          window.AUQLUE = function() { return 42; }
          try {
            window.AUQLUE()
          }
          catch(e) {
            throw new Error("PageMod scripts executed in order");
          }
        },
        'new ' + function contentScript() {
          window.test = true;
        }
      ]
    }], function(win, done) {
      test.assertEqual(win.AUQLUE(), 42, "PageMod test #2: first script has run");
      test.assertEqual(win.test, true, "PageMod test #2: second script has run");
      test.assertEqual("AUQLUE" in win, true,
                       "PageMod test #2: scripts get a wrapped window");
      done();
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
      include: include,
      contentScript: 'new ' + function() {
        onMessage = function(msg) {
          window[msg] = true;
        }
      },
      onOpen: function(worker, mod) {
        worker.postMessage(mod.include[0]);
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
    function(win, done) {
      asserts.forEach(function(fn) {
        fn(test, win);
      })
      done();
    });
};

exports.testPageModErrorHandling = function(test) {
  test.assertRaises(function() {
      new pageMod.PageMod();
    },
    'The PageMod must have a string or array `include` option.',
    "PageMod() throws when 'include' option is not specified.");
};

/* Tests for internal functions. */
exports.testParseURLRule = function(test) {
  let loader = test.makeSandboxedLoader();
  let pageMod = loader.require("page-mod");
  let URLRule = loader.findSandboxForModule("page-mod").
                            globalScope.URLRule;

  test.assertRaises(function() {
      URLRule("*.google.com/*");
    },
    /There can be at most one/,
    "URLRule throws when supplied multiple '*'");

  test.assertRaises(function() {
      URLRule("google.com");
    },
    /expected to be either an exact URL/,
    "parseURLRule throws when the wildcard doesn't use '*' and doesn't " +
    "look like a URL");

  test.assertRaises(function() {
      URLRule("http://google*.com");
    },
    /expected to be the first or the last/,
    "parseURLRule throws when a '*' is in the middle of the wildcard");

  test.assertEqual(
    URLRule("http://google.com/test").exactURL,
    "http://google.com/test"
  );

  test.assertEqual(
    URLRule("http://google.com/test/*").urlPrefix,
    "http://google.com/test/"
  );

  test.assertEqual(
    URLRule("*.example.com").domain,
    "example.com"
  );
};

exports.testRulesMatchURL = function(test) {
  let loader = test.makeSandboxedLoader();
  let pageMod = loader.require("page-mod");
  let { PageModManager, RULES } = loader.findSandboxForModule("page-mod").
                             globalScope;
  let pageModManager = PageModManager.compose({
    get onContentWindow() this._onContentWindow
  })();
  let ruleMatched;
  pageModManager.on('test', function(url) ruleMatched = true);
  function rulesMatchURL([rule], location) {
    ruleMatched = false;
    RULES.test = rule;
    pageModManager.onContentWindow({
      location: 'string' == typeof location ? { toString: function() location }
        : location
    });
    return ruleMatched;
  }
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

exports.testCommunication1 = function(test) {
  let workerDone = false,
      callbackDone = null;

  testPageMod(test, "about:", [{
      include: "about:*",
      contentScriptWhen: 'ready',
      contentScript: 'new ' + function WorkerScope() {
        self.on('message', function(msg) {
          document.body.setAttribute('JEP-107', 'worked');
          postMessage(document.body.getAttribute('JEP-107'));
        })
      },
      onOpen: function(worker) {
        worker.on('error', function(e) {
          test.fail('Errors where reported');
        });
        worker.on('message', function(value) {
          test.assertEqual(
            "worked",
            value,
            "test comunication"
          );
          workerDone = true;
          if (callbackDone)
            callbackDone();
        });
        worker.postMessage('do it!')
      }
    }],
    function(win, done) {
      (callbackDone = function() {
        if (workerDone) {
          test.assertEqual(
            'worked',
            win.document.body.getAttribute('JEP-107'),
            'attribute should be modified'
          );
          done();
        }
      })();
    }
  );
};

exports.testCommunication2 = function(test) {
  let callbackDone = null,
      window;

  testPageMod(test, "about:", [{
      include: "about:*",
      contentScriptWhen: 'start',
      contentScript: 'new ' + function WorkerScope() {
        window.AUQLUE = function() { return 42; }
        window.addEventListener('load', function listener() {
          postMessage('onload');
        }, false);
        onMessage = function() {
          postMessage(window.test)
        }
      },
      onOpen: function(worker) {
        worker.on('error', function(e) {
          test.fail('Errors where reported');
        });
        worker.on('message', function(msg) {
          if ('onload' == msg) {
            test.assertEqual(
              42,
              window.AUQLUE(),
              'PageMod scripts executed in order'
            );
            window.test = 'changes in window';
            worker.postMessage('get window.test')
          } else {
            test.assertEqual(
              'changes in window',
              msg,
              'PageMod test #2: second script has run'
            )
            callbackDone();
          }
        });
      }
    }],
    function(win, done) {
      window = win;
      callbackDone = done;
    }
  );
};

