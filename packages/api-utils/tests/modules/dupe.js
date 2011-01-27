define({
  name: 'dupe'
});

// This is wrong and should not be allowed. Only one call to
// define per file.
define([], function () {
  return {
    name: 'dupe2'
  };
});
