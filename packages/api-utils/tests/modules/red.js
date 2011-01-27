define(function (require) {
  // comment fake-outs for require finding.
  // require('bad1');
  return {
    name: 'red',
    parentType: require('./color').type
  };

  /*
   require('bad2');
  */
});
