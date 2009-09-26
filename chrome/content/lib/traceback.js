var get = exports.get = function get() {
  var frame = Components.stack.caller;
  var stack = [];

  while (frame) {
    var filename = frame.filename.split(" -> ").slice(-1)[0];
    stack.splice(0, 0, {filename: filename,
                        lineNo: frame.lineNumber,
                        funcName: frame.name});
    frame = frame.caller;
  }

  return stack;
};
