let panels = require('panel');
let URL = require("url").URL;
let tests = {}, panels, Panel;

tests.testPanel = function(test) {
  test.waitUntilDone();
  let panel = panels.add(Panel({
    contentURL: "about:buildconfig",
    contentScript: "postMessage('')",
    onMessage: function (message) {
      panels.remove(panel);
      test.pass("The panel was loaded.");
      test.done();
    }
  }));
};

tests.testShowHidePanel = function(test) {
  test.waitUntilDone();
  let panel = panels.add(Panel({
    contentScript: "postMessage('')",
    contentScriptWhen: "ready",
    onMessage: function (message) {
      panel.show();
    },
    onShow: function () {
      test.pass("The panel was shown.");
      panel.hide();
    },
    onHide: function () {
      panels.remove(panel);
      test.pass("The panel was hidden.");
      test.done();
    }
  }));
};

tests.testResizePanel = function(test) {
  test.waitUntilDone();
  let panel = panels.add(Panel({
    contentScript: "postMessage('')",
    contentScriptWhen: "ready",
    height: 10,
    width: 10,
    onMessage: function (message) {
      panel.show();
    },
    onShow: function () {
      panel.resize(100,100);
      panel.hide();
    },
    onHide: function () {
      test.assert((panel.width == 100) && (panel.height == 100),
        "The panel was resized.");
      test.done();
    }
  }));
};

tests.testHideBeforeShow = function(test) {
  test.waitUntilDone();
  let showCalled = false;
  let panel = panels.add(Panel({
    onShow: function () {
      showCalled = true;
    },
    onHide: function () {
      test.assert(!showCalled, 'must not emit show if was hidden before');
      test.done();
    }
  }));
  panel.show();
  panel.hide();
};

tests.testSeveralShowHides = function(test) {
  test.waitUntilDone();
  let hideCalled = 0;
  let panel = panels.add(panels.Panel({
    contentURL: "about:buildconfig",
    onShow: function () {
      panel.hide();
    },
    onHide: function () {
      hideCalled++;
      if (hideCalled < 3)
        panel.show();
      else {
        test.pass("onHide called three times as expected");
        test.done();
      }
    }
  }));
  panel.on('error', function(e) {
    test.fail('error was emitted:' + e.message + '\n' + e.stack);
  });
  panel.show();
};

tests.testContentURLOption = function(test) {
  const URL_STRING = "about:buildconfig";
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
    test.assert(panel.contentURL == null,
                "contentURL is undefined.");
  }

  test.assertRaises(function () Panel({ contentURL: "foo" }),
                    "The `contentURL` option must be a URL.",
                    "Panel throws an exception if contentURL is not a URL.");
};

tests['test:destruct before removed'] = function(test) {
  test.waitUntilDone();
  let loader = new test.makeSandboxedLoader();
  let panels = loader.require('panel');
  let { Panel } = loader.findSandboxForModule("panel").globalScope;
  let PanelShim = Panel.compose({ destructor: function() this._destructor() });
  PanelShim.prototype = Panel.prototype;
  
  let isShowEmitted = false;

  let panel = PanelShim({
    contentURL: "about:buildconfig",
    onShow: function onShow() {
      test.pass('shown was emitted');
      panel.destructor();
    },
    onHide: function onHide() {
      test.done();
    }
  });
  panels.add(panel);
  panel.on('error', function(e) {
    test.fail('error emit was emitted:' + e.message + '\n'+ e.stack)
  });
  panel.show();
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


