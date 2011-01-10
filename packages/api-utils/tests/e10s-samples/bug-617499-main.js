exports.main = function(options, callbacks) {
  require("e10s-samples/bug-617499").go();
  callbacks.quit();
}
