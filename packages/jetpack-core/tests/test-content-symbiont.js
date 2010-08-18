const {Cc,Ci} = require("chrome");
const contentSymbionts = require("content-symbiont");
const self = require("self");

function makeWindow() {
  let content =
    '<?xml version="1.0"?>' +
    '<window ' +
    'xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul">' +
    '<iframe id="content" type="content"/>' +
    '</window>';
  var url = "data:application/vnd.mozilla.xul+xml," +
            encodeURIComponent(content);
  var features = ["chrome", "width=10", "height=10"];

  return Cc["@mozilla.org/embedcomp/window-watcher;1"].
         getService(Ci.nsIWindowWatcher).
         openWindow(null, url, null, features.join(","), null);
}

exports.testContentSymbiont = function(test) {
  let window = makeWindow();

  function onLoad() {
    window.removeEventListener("load", onLoad, false);

    let frame = window.document.getElementById("content");
    let contentScripts = ["1;", "2;"];
    let contentSymbiont = contentSymbionts.ContentSymbiont({
      frame: frame,
      contentScriptURL: self.data.url("test-content-symbiont.js"),
      contentScript: contentScripts,
      contentScriptWhen: "start",
      globalName: "thing"
    });

    test.assertEqual(contentSymbiont.frame, frame,
                     "The frame property is as specified in options.");

    test.assertEqual(contentSymbiont.contentScriptURL.length, 1,
                     "There is one contentScriptURL, as specified in options.");
    test.assertEqual(
      [i for each (i in contentSymbiont.contentScriptURL)][0],
      self.data.url("test-content-symbiont.js"),
      "The contentScriptURL's value is as specified in options."
    );

    test.assertEqual(contentSymbiont.contentScript.length, 2,
                     "There are two contentScripts, as specified in options.");
    test.assertEqual([i for each (i in contentSymbiont.contentScript)][0],
                     contentScripts[0],
                     "The first contentScript is as specified in options.");
    test.assertEqual([i for each (i in contentSymbiont.contentScript)][1],
                     contentScripts[1],
                     "The second contentScript is as specified in options.");

    test.assertEqual(contentSymbiont.contentScriptWhen, "start",
                     "contentScriptWhen is as specified in options.");

    test.done();
    window.close();

    frame.setAttribute("src", "data:text/html,<html><body></body></html>");
  }

  window.addEventListener("load", onLoad, false);

  test.waitUntilDone();
}

exports.testCommunication = function(test) {
  let window = makeWindow();
  let contentSymbiont;

  function onMessage1(message, callback) {
    test.assertEqual(message, 1, "Program gets message via onMessage.");
    test.assert(callback, "Program gets callback via onMessage.");
    contentSymbiont.onMessage.remove(onMessage1);
    contentSymbiont.onMessage.add(onMessage2);
    callback(2);
  };

  function onMessage2(message) {
    test.pass("Content script gets message via callback.");
    contentSymbiont.sendMessage(4, function(message) {
      test.pass("Content script gets message via onMessage.");
      test.pass("Content script gets callback via onMessage.");
      test.assertEqual(message, 5, "Program gets message via callback.");
      test.done();
    });
  }

  function onLoad() {
    window.removeEventListener("load", onLoad, false);
    let frame = window.document.getElementById("content");
    contentSymbiont = contentSymbionts.ContentSymbiont({
      frame: frame,
      contentScript: "\
        thing.sendMessage(1, function (message, callback) {\
          if (message === 2)\
            thing.sendMessage(3)\
        });\
        thing.onMessage.add(function (message, callback) {\
          if (message === 4) callback(5)\
        });\
      ",
      onMessage: onMessage1,
      globalName: "thing"
    });
    frame.setAttribute("src", "data:text/html,<html><body></body></html>");
  }

  window.addEventListener("load", onLoad, false);

  test.waitUntilDone();
};
