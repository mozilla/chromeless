var simpleFeature = require("simple-feature");
var windowUtils = require("window-utils");

function selectMenuItem(item) {
  var document = item.ownerDocument;
  var sourceEvent = document.createEvent("Event");
  var cmdEvent = document.createEvent("XULCommandEvent");
  cmdEvent.initCommandEvent("command", true, true, null,
                            0, false, false, false, false,
                            sourceEvent);
  return item.dispatchEvent(cmdEvent);
}

exports.testAddMenuItem = function(test) {
  if (!simpleFeature.isAppSupported())
    return;

  var itemsAdded = 0;
  for (window in windowUtils.windowIterator()) {
    let clicked = 0;
    var item = simpleFeature.tryAddMenuItem(window.document, "NO U",
                                            function() { clicked++; });
    if (item) {
      itemsAdded++;
      if (clicked)
        test.fail("clicked should be 0");
      selectMenuItem(item);
      test.assertEqual(clicked, 1, "selecting item should trigger callback");
      item.parentNode.removeChild(item);
      item = null;
    }
  }
  if (itemsAdded)
    test.pass("added menu item at least once");
  else
    test.fail("couldn't add menu item");
};

exports.testSimpleFeature = function(test) {
  var feature = new simpleFeature.SimpleFeature("hi", function() {});
  feature.unload();
  test.pass("SimpleFeature() can be instantiated and unloaded.");
};
