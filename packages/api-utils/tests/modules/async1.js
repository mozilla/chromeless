define(['./traditional2', './async2'], function () {
  var traditional2 = require('./traditional2');
  return {
    name: 'async1',
    traditional1Name: traditional2.traditional1Name,
    traditional2Name: traditional2.name,
    async2Name: require('./async2').name,
    async2Traditional2Name: require('./async2').traditional2Name
  };
});
