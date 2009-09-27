exports.testConsole = function(test) {
  var prints = [];
  function print(message) {
    prints.push(message);
  }
  function lastPrint() {
    return prints.slice(-1)[0];
  }

  var Console = require("dump-console").Console;
  var con = new Console(print);

  test.pass("console instantiates");

  con.log('testing', 1, [2, 3, 4]);

  test.assertEqual(lastPrint(), "info: testing 1 2,3,4\n",
                   "console.log() must work.");
};
