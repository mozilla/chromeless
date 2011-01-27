var superpower = require("e10s-samples/superpower");

exports.main = function(options, callbacks) {
  console.log("superpower.use returned",
              superpower.use("hello", "there"));
  callbacks.quit();
}
