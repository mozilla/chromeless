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
      onAttach: function(worker, mod) {
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
      onAttach: function(worker) {
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
      onAttach: function(worker) {
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

