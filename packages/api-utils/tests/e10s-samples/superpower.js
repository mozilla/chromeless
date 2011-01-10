var chrome = require("chrome");

var gDelegate = null;

exports.setDelegate = function(delegate) {
  gDelegate = delegate;
};

exports.use = function(a, b) {
  if (gDelegate)
    return gDelegate(a, b);
  return null;
};
