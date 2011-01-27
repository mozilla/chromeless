define(['exports', './pollux'], function(exports, pollux) {
  exports.name = 'castor';
  exports.getPolluxName = function () {
    return pollux.name;
  };
});
