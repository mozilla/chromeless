let tests = {}, hiddenFrames, HiddenFrame;

tests.testFrame = function(test) {
  let url = "data:text/html,<!DOCTYPE%20html>";
  test.waitUntilDone();
  let hiddenFrame = hiddenFrames.add(HiddenFrame({
    onReady: function () {
      test.assertEqual(this.element.contentWindow.location, "about:blank",
                       "HiddenFrame loads about:blank by default.");

      function onDOMReady() {
        hiddenFrame.element.removeEventListener("DOMContentLoaded", onDOMReady,
                                                false);
        test.assertEqual(hiddenFrame.element.contentWindow.location, url,
                         "HiddenFrame loads the specified content.");
        test.done();
      }
      this.element.addEventListener("DOMContentLoaded", onDOMReady, false);
      this.element.setAttribute("src", url);
    }
  }));
};

let hiddenFrameSupported = true;

try {
  hiddenFrames = require("hidden-frame");
  HiddenFrame = hiddenFrames.HiddenFrame;
}
catch(ex if ex.message == [
    "The hidden-frame module currently supports only Firefox and Thunderbird. ",
    "In the future, we would like it to support other applications, however. ",
    "Please see https://bugzilla.mozilla.org/show_bug.cgi?id=546740 for more ",
    "information."
  ].join("")) {
  hiddenFrameSupported = false;
}

if (hiddenFrameSupported) {
  for (let test in tests)
    exports[test] = tests[test];
}
else {
  exports.testHiddenFrameNotSupported = function(test) {
    test.pass("The hidden-frame module is not supported on this app.");
  } 
}
