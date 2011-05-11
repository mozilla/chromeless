"use strict";

const { Cc, Ci } = require('chrome');
const { Symbiont } = require('content/symbiont');
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

exports['test:constructing symbiont && validating API'] = function(test) {
  let window = makeWindow();
  window.addEventListener("load", function onLoad() {
    window.removeEventListener("load", onLoad, false);
    let frame = window.document.getElementById("content");
    // TODO: support arrays ??
    let contentScripts = ["1;", "2;"];
    let contentSymbiont = Symbiont({
      frame: frame,
      contentScriptFile: self.data.url("test-content-symbiont.js"),
      contentScript: contentScripts,
      contentScriptWhen: "start"
    });

    test.assertEqual(
      self.data.url("test-content-symbiont.js"),
      contentSymbiont.contentScriptFile,
      "There is one contentScriptFile, as specified in options."
    );
    test.assertEqual(
      contentScripts.length,
      contentSymbiont.contentScript.length,
      "There are two contentScripts, as specified in options."
    );
    test.assertEqual(
      contentScripts[0],
      contentSymbiont.contentScript[0],
      "There are two contentScripts, as specified in options."
    );
    test.assertEqual(
      contentScripts[1],
      contentSymbiont.contentScript[1],
      "There are two contentScripts, as specified in options."
    )
    test.assertEqual(
      contentSymbiont.contentScriptWhen,
      "start",
      "contentScriptWhen is as specified in options."
    );

    test.done();
    window.close();
    frame.setAttribute("src", "data:text/html,<html><body></body></html>");
  }, false);
  test.waitUntilDone();
};

exports["test:communication with worker global scope"] = function(test) {
  let window = makeWindow();
  let contentSymbiont;

  function onMessage1(message) {
    test.assertEqual(message, 1, "Program gets message via onMessage.");
    contentSymbiont.removeListener('message', onMessage1);
    contentSymbiont.on('message', onMessage2);
    contentSymbiont.postMessage(2);
  };

  function onMessage2(message) {
    if (5 == message) {
      test.done();
    } else {
      test.assertEqual(message, 3, "Program gets message via onMessage2.");
      contentSymbiont.postMessage(4)
    }
  }

  window.addEventListener("load", function onLoad() {
    window.removeEventListener("load", onLoad, false);
    let frame = window.document.getElementById("content");
    contentSymbiont = Symbiont({
      frame: frame,
      contentScript: 'new ' + function() {
        postMessage(1);
        onMessage = function onMessage(message) {
          if (message === 2)
            postMessage(3);
          if (message === 4)
            postMessage(5);
        };
      } + '()',
      onMessage: onMessage1
    });
    
    frame.setAttribute("src", "data:text/html,<html><body></body></html>");
  }, false);
  test.waitUntilDone();
};

exports['test:pageWorker'] = function(test) {
  test.waitUntilDone();
  let worker =  Symbiont({
    contentURL: 'about:buildconfig',
    contentScript: 'new ' + function WorkerScope() {
      self.on('message', function(data) {
        if (data.valid)
          postMessage('bye!');
      })
      self.postMessage(window.location.toString());
    },
    onMessage: function(msg) {
      if (msg == 'bye!') {
        test.done()
      } else {
        test.assertEqual(
          worker.contentURL + '',
          msg
        );
        worker.postMessage({ valid: true });
      }
    }
  });
};

exports["test:document element present on 'start'"] = function(test) {
  test.waitUntilDone();
  let xulApp = require("xul-app");
  let worker = Symbiont({
    contentURL: "about:buildconfig",
    contentScript: "postMessage(!!document.documentElement)",
    contentScriptWhen: "start",
    onMessage: function(message) {
      if (xulApp.versionInRange(xulApp.platformVersion, "2.0b6", "*"))
        test.assert(message, "document element present on 'start'");
      else
        test.pass("document element not necessarily present on 'start'");
      test.done();
    }
  });
};
