var timer = require("timer");

var TestRunner = exports.TestRunner = function TestRunner(options) {
  this.test = options.test;
  this.isDone = false;
  this.passed = 0;
  this.failed = 0;
  this.onDone = options.onDone;
  this.waitTimeout = null;
}

TestRunner.prototype = {
  DEFAULT_PAUSE_TIMEOUT: 10000,

  done: function done() {
    if (!this.isDone) {
      this.isDone = true;
      if (this.waitTimeout !== null) {
        timer.clearTimeout(this.waitTimeout);
        this.waitTimeout = null;
      }
      if (this.onDone !== null) {
        this.onDone();
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

    this.waitTimeout = timer.setTimeout(tiredOfWaiting, ms);
  },

  start: function start() {
    this.test(this);
    if (this.waitTimeout === null)
      this.done();
  }
};
