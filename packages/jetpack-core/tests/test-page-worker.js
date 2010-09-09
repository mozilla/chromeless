let tests = {}, Pages, Page;

tests.testSimplePageCreation = function(test) {
  test.waitUntilDone();

  let page = new Page({
    contentScript: "pageWorker.sendMessage(window.location.href)",
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
    content: "<script>document.getElementById=3;window.scrollTo=3;</script>",
    contentScript: "window.addEventListener('load', function () " +
                   "pageWorker.sendMessage([typeof(document.getElementById), " +
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

  for each (let prop in ['content', 'allow', 'contentScriptURL',
                         'contentScript', 'contentScriptWhen', 'onMessage',
                         'sendMessage']) {
    test.assert(prop in page, prop + " property is defined on unadded page.");
  }

  test.assertRaises(
    function () page.sendMessage("foo"),
    "You have to add the page before you can send a message to it.",
    "sendMessage throws exception on unadded page."
  );
}

tests.testAddedPageProperties = function(test) {
  let page = Pages.add(new Page());

  for each (let prop in ['content', 'allow', 'contentScriptURL',
                         'contentScript', 'contentScriptWhen', 'onMessage',
                         'sendMessage']) {
    test.assert(prop in page, prop + " property is defined on added page.");
  }

  test.assert(function () page.sendMessage("foo") || true,
              "sendMessage doesn't throw exception on added page.");
}

tests.testConstructorAndDestructor = function(test) {
  test.waitUntilDone();

  let loader = new test.makeSandboxedLoader();
  let Pages = loader.require("page-worker");
  let global = loader.findSandboxForModule("page-worker").globalScope;

  let pagesReady = 0;

  let page1 =
    Pages.add(Pages.Page({ contentScript: "pageWorker.sendMessage('')",
                           onMessage: pageReady }));
  let page2 =
    Pages.add(Pages.Page({ contentScript: "pageWorker.sendMessage('')",
                           onMessage: pageReady }));

  if (page1 === page2)
    test.fail("Page 1 and page 2 should be different objects.");

  function pageReady() {
    if (++pagesReady == 2) {
      Pages.remove(page1);
      Pages.remove(page2);

      test.assertEqual(global.cache.length, 0, "Pages correctly unloaded.");

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
    contentScript: "pageWorker.sendMessage('')",
    onMessage: function() {
      loader.unload();
      test.assertEqual(global.cache.length, 0, "Page correctly unloaded.");
      test.done();
    }
  }));
}

tests.testPageWorkAddition = function(test) {
  test.assertRaises(function () Pages.add(3),
                    "The object to be added must be a Page Worker instance.",
                    "Only Page Worker objects can be added.");
}

tests.testValidateOptions = function(test) {
  test.assertRaises(
    function () Page({content: 0}),
    "The content option must be a string of HTML or a URL.",
    "Validation correctly denied a non-string content"
  );

  test.assertRaises(
    function () Page({onMessage: "This is not a function."}),
    "The option \"onMessage\" must be one of the following types: undefined, " +
    "function, array",
    "Validation correctly denied a non-function onMessage."
  );

  test.assertRaises(
    function () Page({onMessage: [function () {}, "This is not a function."]}),
    "The option \"onMessage\" must be one of the following types: undefined, " +
    "function, array",
    "Validation correctly denied a non-array-of-functions onMessage."
  );

  test.pass("Options validation is working.");
}

tests.testContentAndAllowGettersAndSetters = function(test) {
  test.waitUntilDone();

  let page = Pages.add(Page({
    content: "<script>window.scrollTo=3</script>",
    contentScript: "window.addEventListener('load', function () " +
                   "pageWorker.sendMessage(typeof(window.scrollTo)), true)",
    onMessage: step0
  }));

  function step0(message) {
    test.assertEqual(message, "number",
                     "Correct type expected for scrollTo - number");
    test.assertEqual(page.content, "<script>window.scrollTo=3</script>",
                     "Correct content expected");
    page.onMessage = step1;
    page.allow = { script: false };
    page.content = "<script>window.scrollTo='f'</script>";
  }

  function step1(message) {
    test.assertEqual(message, "function",
                     "Correct type expected for scrollTo - function");
    test.assertEqual(page.content, "<script>window.scrollTo='f'</script>",
                     "Correct content expected");
    page.onMessage = step2;
    page.allow = { script: true };
    page.content = "<script>window.scrollTo='g'</script>";
  }

  function step2(message) {
    test.assertEqual(message, "string",
                     "Correct type expected for scrollTo - string");
    test.assertEqual(page.content, "<script>window.scrollTo='g'</script>",
                     "Correct content expected");
    page.onMessage = step3;
    page.allow.script = false;
    page.content = "<script>window.scrollTo=3</script>";
  }
  
  function step3(message) {
    test.assertEqual(message, "function",
                     "Correct type expected for scrollTo - function");
    test.assertEqual(page.content, "<script>window.scrollTo=3</script>",
                     "Correct content expected");
    page.onMessage = step4;
    page.allow.script = true;
    page.content = "<script>window.scrollTo=4</script>";
  }
  
  function step4(message) {
    test.assertEqual(message, "number",
                     "Correct type expected for scrollTo - number");
    test.assertEqual(page.content, "<script>window.scrollTo=4</script>",
                     "Correct content expected");
    test.done();
  }

}

tests.testOnMessageCallback = function(test) {
  test.waitUntilDone();
  
  Pages.add(Page({
    contentScript: "pageWorker.sendMessage('')",
    onMessage: function() {
      test.pass("onMessage callback called");
      test.done();
    }
  }));

}

tests.testMultipleOnMessageCallbacks = function(test) {
  test.waitUntilDone();
  
  let count = 0;
  Pages.add(Page({
    contentScript: "pageWorker.sendMessage('')",
    onMessage: [
      function() count += 1,
      function() count += 2,
      function() count *= 3,
      function() test.assertEqual(count, 9,
                                  "All callbacks were called, in order."),
      function() test.done()
    ]
  }));

}

tests.testLoadContentPage = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onMessage: function(message) {
      // The message is an array whose first item is the test method to call
      // and the rest of whose items are arguments to pass it.
      test[message.shift()].apply(test, message);
    },
    content: require("self").data.load("test-page-worker.html"),
    contentScript: require("self").data.load("test-page-worker.js")
  }));

}

tests.testAllowScript = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onMessage: function(message) {
      test.assert(message, "Script is allowed to run by default.");
      test.done();
    },
    content: "<script>window.foo=3;</script>",
    contentScript: "window.addEventListener('DOMContentLoaded', function () " +
                   "pageWorker.sendMessage('foo' in window), false)"
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
    content: "<script>window.foo=3;</script>",
    contentScript: "window.addEventListener('DOMContentLoaded', function () " +
                   "pageWorker.sendMessage(('foo' in window) && window.foo " +
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
