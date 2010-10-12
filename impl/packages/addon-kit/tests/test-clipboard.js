
// Test the typical use case, setting & getting with no flavors specified
exports.testWithNoFlavor = function(test) {
  var contents = "hello there";
  var flavor = "text";
  var fullFlavor = "text/unicode";
  var clip = require("clipboard");
  // Confirm we set the clipboard
  test.assert(clip.set(contents));
  // Confirm flavor is set
  test.assertEqual(clip.currentFlavors[0], flavor);
  // Confirm we set the clipboard
  test.assertEqual(clip.get(), contents);
  // Confirm we can get the clipboard using the flavor
  test.assertEqual(clip.get(flavor), contents);
  // Confirm we can still get the clipboard using the full flavor
  test.assertEqual(clip.get(fullFlavor), contents);
};

// Test the slightly less common case where we specify the flavor
exports.testWithFlavor = function(test) {
  var contents = "<b>hello there</b>";
  var flavor = "html";
  var fullFlavor = "text/html";
  var clip = require("clipboard");
  test.assert(clip.set(contents, flavor));
  test.assertEqual(clip.currentFlavors[0], flavor);
  // Confirm default flavor returns null
  test.assertEqual(clip.get(), null);
  test.assertEqual(clip.get(flavor), contents);
  test.assertEqual(clip.get(fullFlavor), contents);
};

// Test that the typical case still works when we specify the flavor to set
exports.testWithRedundantFlavor = function(test) {
  var contents = "<b>hello there</b>";
  var flavor = "text";
  var fullFlavor = "text/unicode";
  var clip = require("clipboard");
  test.assert(clip.set(contents, flavor));
  test.assertEqual(clip.currentFlavors[0], flavor);
  test.assertEqual(clip.get(), contents);
  test.assertEqual(clip.get(flavor), contents);
  test.assertEqual(clip.get(fullFlavor), contents);
};

exports.testNotInFlavor = function(test) {
  var contents = "hello there";
  var flavor = "html";
  var clip = require("clipboard");
  test.assert(clip.set(contents));
  // If there's nothing on the clipboard with this flavor, should return null
  test.assertEqual(clip.get(flavor), null);
};
// TODO: Test error cases.
