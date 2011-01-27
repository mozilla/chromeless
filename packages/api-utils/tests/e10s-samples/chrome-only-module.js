var chrome = require("chrome");

exports.notAccessibleFromAddons = function() {
  throw new Error("This function should never be called from addons.");
};
