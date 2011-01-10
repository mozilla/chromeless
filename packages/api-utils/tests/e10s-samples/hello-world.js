exports.main = function(options, callbacks) {
  console.log("hello", "world");
  console.info("sup", "dogg");
  console.warn("how", "r", "u");
  console.debug("gud");
  console.error("NO U");
  console.exception(new Error("o snap"));
  console.log({toString: function() { throw new Error(); }});
  console.trace();
  callbacks.quit();
};
