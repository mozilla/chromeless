if (this.chrome) {
  // TODO: register receiver for async msg.
  chrome.on("asyncy", function() {
    console.log("i am an async message from firefox");
  });
  exports.go = function() {
    console.log("about to send sync message to firefox");
    chrome.call("superpower");
    console.log("returned from sync message to firefox");
  };
} else {
  exports.register = function(addon) {
    addon.registerCall("superpower", function(name) {
      addon.send("asyncy");
    });
  };
}
