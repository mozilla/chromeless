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

  con.log("testing", { toString: function() "obj.toString()" });
  test.assertEqual(lastPrint(), "info: testing obj.toString()\n",
                   "PlainTextConsole.log() must stringify custom toString.");

  con.log("testing", { toString: function() { throw "fail!"; } });
  test.assertEqual(lastPrint(), "info: testing <toString() error>\n",
                   "PlainTextConsole.log() must stringify custom bad toString.");

  con.exception(new Error("blah"));
  var tbLines = prints[0].split("\n");
  test.assertEqual(tbLines[0], "error: An exception occurred.");
  test.assertEqual(tbLines[1], "Traceback (most recent call last):");
  test.assertEqual(tbLines.slice(-2)[0], "Error: blah");

  prints = [];
  con.trace();
  tbLines = prints[0].split("\n");
  test.assertEqual(tbLines[0], "info: Traceback (most recent call last):");
  test.assertEqual(tbLines.slice(-2)[0].trim(), "con.trace();");
};
