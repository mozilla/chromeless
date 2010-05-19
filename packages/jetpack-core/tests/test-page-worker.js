let tests = {}, Pages, Page;
let globalPage; // When possible, we reuse this instead of creating a new Page

tests.testSimplePageCreation = function(test) {

  test.waitUntilDone();

  let page = new Page({onReady: function () {
    test.assertEqual(page.window.location.href, "about:blank",
                     "Page Worker should start with a blank page by default");
    test.pass("Simple Page Worker creation worked");
    test.done();
  }});

  Pages.add(page);

}

tests.testNativeWrapper = function(test) {
  test.waitUntilDone();

  let page = Pages.add(Page({
    allow: { script: true },
    content: "<script>document.getElementById=3;window.scrollTo=3;</script>",
    onReady: function () {

      test.assertEqual(typeof(page.document.getElementById),
                       "function",
                       "page.document should be a trusted object");

      test.assertEqual(typeof(page.window.scrollTo),
                       "function",
                       "page.window should be a trusted object");

      test.assertEqual(typeof(page.document.wrappedJSObject.getElementById),
                       "number",
                       "document inside page is free to be changed");

      test.assertEqual(typeof(page.window.wrappedJSObject.scrollTo),
                       "number",
                       "window inside page is free to be changed");

      test.done();
    }
  }));

}

tests.testUnitializedPageProperties = function(test) {
  let page = new Page();

  for each (prop in ['window', 'document']) {
    test.assert(!(prop in page), prop + " property shouldn't be defined");
  }

  for each (prop in ['onReady', 'allow', 'content']){
    test.assert(prop in page, prop + " property was defined on creation");
  }

  test.pass("Correct properties are defined before Page Worker is add()ed.");
}

tests.testPageProperties = function(test) {
  let page = globalPage;

  for each (prop in ['window', 'document', "content", "allow", "onReady"]) {
    if (!(prop in page)) {
      test.fail(prop + " property missing from the Page Worker public API");
    }
  }

  test.pass("Page properties are ok");

}

tests.testConstructorAndDestructor = function(test) {
  test.waitUntilDone();

  let pagesReady = 0;

  let page1 = Pages.add(Page({ onReady: pageReady }));
  let page2 = Pages.add(Page({ onReady: pageReady }));

  if (page1 == page2) {
    test.fail("Page 1 and Page 2 should be different objects");
  }

  function pageReady() {
    if (++pagesReady == 2) {

      Pages.remove(page1);
      Pages.remove(page2);

      test.assert(!page1.window, "Page 1 correctly unloaded");
      test.assert(!page2.window, "Page 2 correctly unloaded");

      test.pass("Constructor and destructor are working properly");
      test.done();

    }
  }

}

tests.testAutoDestructor = function(test) {
  test.waitUntilDone();

  let loader = test.makeSandboxedLoader();

  let Pages = loader.require("page-worker");
  let page = Pages.add(Pages.Page({onReady: function() { 

    loader.unload();

    test.assert(!page.window, "Page correctly unloaded");

    test.pass("Automatically unload is working properly");
    test.done();

  }}));
}

tests.testPageWorkAddition = function(test) {

  test.assertRaises(function() Pages.add(3),
                    "The object to be added must be a Page Worker instance.",
                    "Only Page Worker objects can be added.");

}

tests.testValidateOptions = function(test) {

  test.assertRaises(function () Page({onReady: "This is not a function"}),
                    "The onReady option must be a function or an array of functions.",
                    "Validation correctly denied a non-function onReady");

  test.assertRaises(function () Page({onReady: [function () {}, "This is not a function"]}),
                    "The onReady option must be a function or an array of functions.",
                    "Validation correctly denied a non-function onReady");

  test.assertRaises(function () Page({content: 0}),
                    "The content option must be an string with HTML or an URL.",
                    "Validation correctly denied a non-string content");

  test.pass("Options validation is working");

}

tests.testContentAndAllowGettersAndSetters = function(test) {
  test.waitUntilDone();

  let page = Pages.add(Page({
    onReady: step1,
    content: "<script>window.scrollTo=3</script>"
  }));

  function step1() {
    test.assertEqual(typeof(page.window.wrappedJSObject.scrollTo), "function",
                     "Correct type expected for scrollTo - function");
    test.assertEqual(page.content, "<script>window.scrollTo=3</script>",
                     "Correct content expected");
    page.onReady = step2;
    page.allow = { script: true };
    page.content = "<script>window.scrollTo='f'</script>";
  }

  function step2() {
    test.assertEqual(typeof(page.window.wrappedJSObject.scrollTo), "string",
                     "Correct type expected for scrollTo - string");
    test.assertEqual(page.content, "<script>window.scrollTo='f'</script>",
                     "Correct content expected");
    page.onReady = step3;
    page.allow.script = false;
    page.content = "<script>window.scrollTo=3</script>";
  }

  function step3() {
    test.assertEqual(typeof(page.window.wrappedJSObject.scrollTo), "function",
                     "Correct type expected for scrollTo - function again");
    test.assertEqual(page.content, "<script>window.scrollTo=3</script>",
                     "Correct content expected");
    page.onReady = step4;
    page.allow.script = true;
    page.content = "<script>window.scrollTo=4</script>";
  }

  function step4() {
    test.assertEqual(typeof(page.window.wrappedJSObject.scrollTo), "number",
                     "Correct type expected for scrollTo - number");
    test.assertEqual(page.content, "<script>window.scrollTo=4</script>",
                     "Correct content expected");

    test.done();
  }

}

tests.testOnReadyCallback = function(test) {
  test.waitUntilDone();
  
  Pages.add(Page({onReady: function() {
    test.pass("onReady callback called");
    test.done();
  }}));

}

tests.testMultipleOnReadyCallbacks = function(test) {
  test.waitUntilDone();
  
  let count = 0;
  Pages.add(Page({onReady: [
    function() count += 1,
    function() count += 2,
    function() count *= 3,
    function() test.assertEqual(count, 9, "All callbacks were called, in order."),
    function() test.done()
  ]}));

}

tests.testLoadContentPage = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onReady: function continueTest() testLoadContentPagePart2(test, page),
    content: __url__.replace(/\.js$/, ".html")
  }));

}

function testLoadContentPagePart2(test, page) {
  
  // get title directly
  test.assertEqual(page.document.title, "Page Worker test",
                   "Correct page title accessed directly");

  // get <p> directly
  let p = page.document.getElementById("paragraph");
  test.assert(p, "<p> can be accessed directly");
  test.assert(p.firstChild.nodeValue == "Lorem ipsum dolor sit amet.",
              "Correct text node expected");

  // Modify page
  let div = page.document.createElement("div");
  div.setAttribute("id", "block");
  div.appendChild(page.document.createTextNode("Test text created"));
  page.document.body.appendChild(div);

  // Check back the modification
  let div = page.document.getElementById("block");
  test.assert(div, "<div> can be accessed directly");
  test.assert(div.firstChild.nodeValue == "Test text created",
              "Correct text node expected");

  test.pass("Load Content works");
  test.done();
}

tests.testDisallowScript = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onReady: check,
    content: "<script>window.foo=3;</script>"
  }));

  function check() {
    let foo = page.window.wrappedJSObject.foo;
    test.assert(foo != 3, "Script isn't allowed to run by default.");
    test.done();
  }

}

tests.testAllowScript = function(test) {

  test.waitUntilDone();

  let page = Pages.add(Page({
    onReady: check,
    content: "<script>window.foo=3;</script>",
    allow: { script: true }
  }));

  function check() {
    let foo = page.window.wrappedJSObject.foo;
    test.assert(foo == 3, "Script isn't allowed to run by default.");
    test.done();
  }

}

let pageWorkerSupported = true;

try {
  
  Pages = require("page-worker");
  Page = Pages.Page;
  globalPage = new Page();
  Pages.add(globalPage);
  
} catch (e if e.message == 
    "The page-worker module currently supports only Firefox and Thunderbird. " +
    "In the future we would like it to support other applications, however. Please " +
    "see https://bugzilla.mozilla.org/show_bug.cgi?id=546740 for more information.") {
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
