var TestRunner = exports.TestRunner = function TestRunner(options) {
  this.passed = 0;
  this.failed = 0;
};

TestRunner.prototype = {
  DEFAULT_PAUSE_TIMEOUT: 10000,

  pass: function pass(message) {
    console.log("pass:", message);
    this.passed++;
  },

  fail: function fail(message) {
    console.log("fail:", message);
    this.failed++;
  },

  exception: function exception(e) {
    console.log("exception:", e, " (" + e.fileName +
                ":" + e.lineNumber + ")");
    if (e.stack)
      console.log("stack:", e.stack);
    this.failed++;
  },

  assertEqual: function assertEqual(a, b, message) {
    if (a == b) {
      if (!message)
        message = "a == b == " + uneval(a);
      this.pass(message);
    } else {
      var inequality = uneval(a) + " != " + uneval(b);
      if (!message)
        message = inequality;
      else
        message += " (" + inequality + ")";
      this.fail(message);
    }
  },

  done: function done() {
    if (!this.isDone) {
      this.isDone = true;
      if (this.waitTimeout !== null) {
        requre("timer").clearTimeout(this.waitTimeout);
        this.waitTimeout = null;
      }
      if (this.onDone !== null) {
        this.onDone(this);
        this.onDone = null;
      }
    }
  },

  waitUntilDone: function waitUntilDone(ms) {
    if (ms === undefined)
      ms = this.DEFAULT_PAUSE_TIMEOUT;

    var self = this;

    function tiredOfWaiting() {
      self.failed++;
      self.done();
    }

    this.waitTimeout = require("timer").setTimeout(tiredOfWaiting, ms);
  },

  startMany: function startMany(options) {
    function runNextTest(self) {
      var test = options.tests.pop();
      if (test)
        self.start({test: test, onDone: runNextTest});
      else
        options.onDone(self);
    }
    runNextTest(this);
  },

  start: function start(options) {
    this.test = options.test;
    this.isDone = false;
    this.onDone = options.onDone;
    this.waitTimeout = null;

    try {
      this.test(this);
    } catch (e) {
      this.exception(e);
    }
    if (this.waitTimeout === null)
      this.done();
  }
};
