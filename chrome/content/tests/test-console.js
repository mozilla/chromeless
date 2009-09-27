exports.testConsole = function(test) {
  var prints = [];
  function print(message) {
    prints.push(message);
  }
  function lastPrint() {
    var last = prints.slice(-1)[0];
    prints = [];
    return last;
  }

  var Console = require("dump-console").Console;
  var con = new Console(print);

  test.pass("Console instantiates");

  con.log('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "info: testing 1 2,3,4\n",
                   "Console.log() must work.");

  con.info('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "info: testing 1 2,3,4\n",
                   "Console.info() must work.");

  con.warn('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "warning: testing 1 2,3,4\n",
                   "Console.warn() must work.");

  con.error('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "error: testing 1 2,3,4\n",
                   "Console.error() must work.");

  con.debug('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "debug: testing 1 2,3,4\n",
                   "Console.debug() must work.");

  con.log('testing', undefined);
  test.assertEqual(lastPrint(), "info: testing undefined\n",
                   "Console.log() must stringify undefined.");

  con.log('testing', null);
  test.assertEqual(lastPrint(), "info: testing null\n",
                   "Console.log() must stringify null.");
};
