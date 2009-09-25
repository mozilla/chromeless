function stringifyArgs(args) {
  var string;
  var stringArgs = [];
  for (var i = 0; i < args.length; i++) {
    try {
      string = args[i].toString();
    } catch (e) {
      string = "<toString() error>";
    }
    stringArgs.push(string);
  }
  return stringArgs.join(" ");
}

function message(print, level, args) {
  print(level + ": " + stringifyArgs(args) + "\n");
}

var Console = exports.Console = function Console(print) {
  if (!print)
    print = dump;
  this.print = print;
};

Console.prototype = {
  log: function log() {
    message(this.print, "info", arguments);
  }
};
