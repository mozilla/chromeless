define(['exports', './castor'], function(exports, castor) {
  exports.name = 'pollux';
  exports.getCastorName = function () {
    return castor.name;
  };
});
