let tests = {}, Pages, Page;


tests.testSimplePageCreation = function(test) {
  test.waitUntilDone();

  let page = new Page({
    contentScript: "postMessage(window.location.href)",
    onMessage: function (message) {
      test.assertEqual(message, "about:blank",
                       "Page Worker should start with a blank page by default");
      test.done();
    }
  });

  Pages.add(page);

}

/* Tests that the window and document objects exposed to the content symbiont
   are the unwrapped versions of their respective DOM objects. */
tests.testUnwrappedDOM = function(test) {
  test.waitUntilDone();

  let page = Pages.add(Page({
    allow: { script: true },
    contentURL: "data:text/html,<script>document.getElementById=3;window.scrollTo=3;</script>",
    contentScript: "window.addEventListener('load', function () " +
                   "postMessage([typeof(document.getElementById), " +
                   "typeof(window.scrollTo)]), true)",
    onMessage: function (message) {
      test.assertEqual(message[0],
                       "number",
                       "document inside page is free to be changed");

      test.assertEqual(message[1],
                       "number",
                       "window inside page is free to be changed");

      test.done();
    }
  }));

}
tests.testUnaddedPageProperties = function(test) {
  let page = new Page();

  for each (let prop in ['contentURL', 'allow', 'contentScriptURL',
                         'contentScript', 'contentScriptWhen',
                         'postMessage', 'on', 'removeListener']) {
    test.assert(prop in page, prop + " property is defined on unadded page.");
  }

  test.assertRaises(
    function () page.postMessage("foo"),
    "You have to add the page before you can send a message to it.",
    "sendMessage throws exception on unadded page."
  );
}

tests.testAddedPageProperties = function(test) {
  let page = Pages.add(new Page());

  for each (let prop in ['contentURL', 'allow', 'contentScriptURL',
                         'contentScript', 'contentScriptWhen', 'on',
                         'postMessage', 'removeListener']) {
    test.assert(prop in page, prop + " property is defined on added page.");
  }

  test.assert(function () page.postMessage("foo") || true,
              "sendMessage doesn't throw exception on added page.");
}

tests.testConstructorAndDestructor = function(test) {
  test.waitUntilDone();

  let loader = new test.makeSandboxedLoader();
  let Pages = loader.require("page-worker");
  let global = loader.findSandboxForModule("page-worker").globalScope;

  let pagesReady = 0;

  let page1 =
    Pages.add(Pages.Page({ contentScript: "postMessage('')",
                           onMessage: pageReady }));
  let page2 =
    Pages.add(Pages.Page({ contentScript: "postMessage('')",
                           onMessage: pageReady }));

  if (page1 === page2)
    test.fail("Page 1 and page 2 should be different objects.");

  function pageReady() {
    if (++pagesReady == 2) {
      Pages.remove(page1);
      Pages.remove(page2);

      test.assert(
        !global.PageRegistry.has(page1) &&
        !global.PageRegistry.has(page2),
        "Pages correctly unloaded."
      );

      loader.unload();
      test.done();
    }
  }
}

tests.testAutoDestructor = function(test) {
  test.waitUntilDone();

  let loader = new test.makeSandboxedLoader();
  let Pages = loader.require("page-worker");
  let global = loader.findSandboxForModule("page-worker").globalScope;

  let page = Pages.add(Pages.Page({
    contentScript: "postMessage('')",
    onMessage: function() {
      loader.unload();
      test.assert(!global.PageRegistry.has(page), "Page correctly unloaded.");
      test.done();
    }
  }));
}

tests.testValidateOptions = function(test) {
  test.assertRaises(
    function () Page({ contentURL: 'home' }),
    "The `contentURL` option must be a URL.",
    "Validation correctly denied a non-string content"
  );

  test.assertRaises(
    function () Page({ onMessage: "This is not a function."}),
    "The event listener must be a function.",
    "Validation correctly denied a non-function onMessage."
  );

  test.pass("Options validation is working.");
}

tests.testContentAndAllowGettersAndSetters = function(test) {
  test.waitUntilDone();
  let content = "data:text/html,<script>window.scrollTo=3</script>";
  let page = Pages.add(Page({
    contentURL: content,
    contentScript: "window.addEventListener('load', function () " +
                   "postMessage(typeof window.scrollTo), true);",
    onMessage: step0
  }));

  function step0(message) {
    test.assertEqual(message, "number",
                     "Correct type expected for scrollTo - number");
    test.assertEqual(page.contentURL, content,
                     "Correct content expected");
    page.removeListener('message', step0);
    page.on('message', step1);
    page.allow = { script: false };
    page.contentURL = content = 
      "data:text/html,<script>window.scrollTo='f'</script>";
  }

  function step1(message) {
    test.assertEqual(message, "function",
                     "Correct type expected for scrollTo - function");
    test.assertEqual(page.contentURL, content, "Correct content expected");
    page.removeListener('message', step1);
    page.on('message', step2);
    page.allow = { script: true };
    page.contentURL = content =
      "data:text/html,<script>window.scrollTo='g'</script>";
  }

  function step2(message) {
    test.assertEqual(message, "string",
                     "Correct type expected for scrollTo - string");
    test.assertEqual(page.contentURL, content, "Correct content expected");
    page.removeListener('message', step2);
    page.on('message', step3);
    page.allow.script = false;
    page.contentURL = content = 
      "data:text/html,<script>window.scrollTo=3</script>";
  }

  function step3(message) {
    test.assertEqual(message, "function",
                     "Correct type expected for scrollTo - function");
    test.assertEqual(page.contentURL, content, "Correct content expected");
    page.removeListener('message', step3);
    page.on('message', step4);
    page.allow.script = true;
    page.contentURL = content = 
      "data:text/html,<script>window.scrollTo=4</script>";
  }

  function step4(message) {
    test.assertEqual(message, "number",
                     "Correct type expected for scrollTo - number");
    test.assertEqual(page.contentURL, content, "Correct content expected");
    test.done();
  }

}

tests.testOnMessageCallback = function(test) {
  test.waitUntilDone();

  Pages.add(Page({
    contentScript: "postMessage('')",
    onMessage: function() {
      test.pass("onMessage callback called");
      test.done();
    }
  }));
}

tests.testMultipleOnMessageCallbacks = function(test) {
  test.waitUntilDone();

  let count = 0;
  let page = Pages.add(Page({
    contentScript: "postMessage('')",
    onMessage: function() count += 1
  }));
  page.on('message', function() count += 2);
  page.on('message', function() count *= 3);
  page.on('message', function()
    test.assertEqual(count, 9, "All callbacks were called, in order."));
  page.on('message', function() test.done());

}

tests.testLoadContentPage = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onMessage: function(message) {
      // The message is an array whose first item is the test method to call
      // and the rest of whose items are arguments to pass it.
      test[message.shift()].apply(test, message);
    },
    contentURL: require("self").data.url("test-page-worker.html"),
    contentScriptURL: require("self").data.url("test-page-worker.js")
  }));

}

tests.testAllowScript = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onMessage: function(message) {
      test.assert(message, "Script is allowed to run by default.");
      test.done();
    },
    contentURL: "data:text/html,<script>window.foo=3;</script>",
    contentScript: "window.addEventListener('DOMContentLoaded', function () " +
                   "postMessage('foo' in window), false)"
  }));
}

tests.testAllowScript = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onMessage: function(message) {
      test.assert(message, "Script runs when allowed to do so.");
      test.done();
    },
    allow: { script: true },
    contentURL: "data:text/html,<script>window.foo=3;</script>",
    contentScript: "window.addEventListener('DOMContentLoaded', function () " +
                   "postMessage(('foo' in window) && window.foo " +
                   "== 3), false)"
  }));

}

let pageWorkerSupported = true;

try {
  Pages = require("page-worker");
  Page = Pages.Page;
}
catch (ex if ex.message == [
    "The page-worker module currently supports only Firefox and Thunderbird. ",
    "In the future, we would like it to support other applications, however. ",
    "Please see https://bugzilla.mozilla.org/show_bug.cgi?id=546740 for more ",
    "information."
  ].join("")) {
  pageWorkerSupported = false;
}

if (pageWorkerSupported) {
  for (let test in tests) {
    exports[test] = tests[test];
  }
} else {
  exports.testPageWorkerNotSupported = function(test) {
    test.pass("The page-worker module is not supported on this app.");
  }
}
