exports.main = function(options, callbacks) {
  console.log(require("e10s-samples/adapter-only").use(1, 5));
  callbacks.quit();
};
