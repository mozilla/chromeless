exports.testPlainTextConsole = function(test) {
  var prints = [];
  function print(message) {
    prints.push(message);
  }
  function lastPrint() {
    var last = prints.slice(-1)[0];
    prints = [];
    return last;
  }

  var Console = require("plain-text-console").PlainTextConsole;
  var con = new Console(print);

  test.pass("PlainTextConsole instantiates");

  con.log('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "info: testing 1 2,3,4\n",
                   "PlainTextConsole.log() must work.");

  con.info('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "info: testing 1 2,3,4\n",
                   "PlainTextConsole.info() must work.");

  con.warn('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "warning: testing 1 2,3,4\n",
                   "PlainTextConsole.warn() must work.");

  con.error('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "error: testing 1 2,3,4\n",
                   "PlainTextConsole.error() must work.");

  con.debug('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "debug: testing 1 2,3,4\n",
                   "PlainTextConsole.debug() must work.");

  con.log('testing', undefined);
  test.assertEqual(lastPrint(), "info: testing undefined\n",
                   "PlainTextConsole.log() must stringify undefined.");

  con.log('testing', null);
  test.assertEqual(lastPrint(), "info: testing null\n",
                   "PlainTextConsole.log() must stringify null.");

  con.exception(new Error("blah"));
  var firstPart = prints[0].slice(0, prints[0].indexOf("("));
  test.assertEqual(firstPart, "error: exception: Error: blah ",
                   "PlainTextConsole.exception() must log exception.");
};
