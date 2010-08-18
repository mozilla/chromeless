let URL = require("url").URL;
let tests = {}, panels, Panel;

tests.testPanel = function(test) {
  test.waitUntilDone();
  let panel = panels.add(Panel({
    contentScript: "panel.sendMessage('')",
    onMessage: function (message) {
      test.pass("The panel was loaded.");
      test.done();
    }
  }));
};

tests.testShowHidePanel = function(test) {
  test.waitUntilDone();
  let panel = panels.add(Panel({
    contentScript: "panel.sendMessage('')",
    contentScriptWhen: "ready",
    onMessage: function (message) {
      panel.show();
    },
    onShow: function () {
      test.pass("The panel was shown.");
      panel.hide();
    },
    onHide: function () {
      test.pass("The panel was hidden.");
      test.done();
    }
  }));
};

tests.testContentURLOption = function(test) {
  test.waitUntilDone();

  const URL_STRING = "http://www.mozilla.org/";
  const HTML_CONTENT = "<html><title>Test</title><p>This is a test.</p></html>";

  let (panel = Panel({ contentURL: URL_STRING })) {
    test.pass("contentURL accepts a string URL.");
    test.assert(panel.contentURL instanceof URL,
                "contentURL is a URL object.");
    test.assertEqual(panel.contentURL.toString(), URL_STRING,
                "contentURL stringifies to the string to which it was set.");
  }

  let url = URL(URL_STRING);
  let (panel = Panel({ contentURL: url })) {
    test.pass("contentURL accepts a URL object.");
    test.assert(panel.contentURL instanceof URL,
                "contentURL is a URL object.");
    test.assertEqual(panel.contentURL.toString(), url.toString(),
                "contentURL stringifies to the URL to which it was set.");
  }

  let dataURL = "data:text/html," + encodeURIComponent(HTML_CONTENT);
  let (panel = Panel({ contentURL: dataURL })) {
    test.pass("contentURL accepts a data: URL.");
  }
  
  let (panel = Panel({})) {
    test.assert(typeof panel.contentURL == "undefined",
                "contentURL is undefined.");
  }

  test.assertRaises(function () Panel({ contentURL: "foo" }),
                    "The contentURL option must be a URL.",
                    "Panel throws an exception if contentURL is not a URL.");
};

let panelSupported = true;

try {
  panels = require("panel");
  Panel = panels.Panel;
}
catch(ex if ex.message == [
    "The panel module currently supports only Firefox.  In the future ",
    "we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=jetpack-panel-apps ",
    "for more information."
  ].join("")) {
  panelSupported = false;
}

if (panelSupported) {
  for (let test in tests)
    exports[test] = tests[test];
}
else {
  exports.testPanelNotSupported = function(test) {
    test.pass("The panel module is not supported on this app.");
  }
}
