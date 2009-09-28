// Undo the auto-parentification of URLs done in bug 418356.
function deParentifyURL(url) {
  return url.split(" -> ").slice(-1)[0];
}

var get = exports.get = function get() {
  var frame = Components.stack.caller;
  var stack = [];

  while (frame) {
    var filename = deParentifyURL(frame.filename);
    stack.splice(0, 0, {filename: filename,
                        lineNo: frame.lineNumber,
                        funcName: frame.name});
    frame = frame.caller;
  }

  return stack;
};
