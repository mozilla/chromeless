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
