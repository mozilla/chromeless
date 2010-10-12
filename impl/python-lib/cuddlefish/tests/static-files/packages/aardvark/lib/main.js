exports.main = function(options, callbacks) {
  console.log("1 + 1 =", require("bar-module").add(1, 1));
  callbacks.quit();
};
