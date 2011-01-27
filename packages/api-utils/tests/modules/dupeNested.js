
define(function () {
  // This is wrong and should not be allowed.
  define('dupeNested2', {
      name: 'dupeNested2'
  });

  return {
    name: 'dupeNested'
  };
});
