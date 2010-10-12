"use strict";

const {Cc,Ci} = require("chrome");

/**
 * A helper function that creates a PageMod, then opens the specified URL
 * and checks the effect of the page mod on 'onload' event via testCallback.
 */
exports.testPageMod = function testPageMod(test, testURL, pageModOptions,
                                           testCallback) {
  var xulApp = require("xul-app");
  if (!xulApp.versionInRange(xulApp.platformVersion, "1.9.3a3", "*") &&
      !xulApp.versionInRange(xulApp.platformVersion, "1.9.2.7", "1.9.2.*")) {
    test.pass("Note: not testing PageMod, as it doesn't work on this platform version");
    return;
  }

  var wm = Cc['@mozilla.org/appshell/window-mediator;1']
           .getService(Ci.nsIWindowMediator);
  var browserWindow = wm.getMostRecentWindow("navigator:browser");
  if (!browserWindow) {
    test.pass("page-mod tests: could not find the browser window, so " +
              "will not run. Use -a firefox to run the pagemod tests.")
    return;
  }

  test.waitUntilDone();
  let loader = test.makeSandboxedLoader();
  let pageMod = loader.require("page-mod");

  var pageMods = [new pageMod.PageMod(opts) for each(opts in pageModOptions)];
  pageMods.forEach(pageMod.add);

  function whenBrowserWindowReady() {
    var tabBrowser = browserWindow.gBrowser || browserWindow.Browser;
    var newTab = tabBrowser.addTab(testURL);
    tabBrowser.selectedTab = newTab;
    var b = newTab.browser || tabBrowser.getBrowserForTab(newTab);

    function onPageLoad() {
      b.removeEventListener("load", onPageLoad, true);
      testCallback(b.contentWindow.wrappedJSObject, function done() {
        pageMods.forEach(function(mod) {pageMod.remove(mod)});
        // XXX leaks reported if we don't close the tab?
        tabBrowser.removeTab(newTab);
        test.done();
      });
    }
    b.addEventListener("load", onPageLoad, true);
  }
  
  if (browserWindow.document.readyState == "complete")
    whenBrowserWindowReady();
  else
    browserWindow.addEventListener("load", whenBrowserWindowReady, false);
}
