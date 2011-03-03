/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var {Cc,Ci} = require("chrome");

var cService = Cc['@mozilla.org/consoleservice;1'].getService()
               .QueryInterface(Ci.nsIConsoleService);

// Cuddlefish loader for the sandbox in which we load and
// execute tests.
var sandbox;

// Function to call when we're done running tests.
var onDone;

// Function to print text to a console, w/o CR at the end.
var print;

// The directories to look for tests in.
var dirs;

// How many more times to run all tests.
var iterationsLeft;

// Only tests in files whose names match this regexp filter will be run.
var filter;

// Whether to report memory profiling information.
var profileMemory;

// Combined information from all test runs.
var results = {
  passed: 0,
  failed: 0,
  testRuns: []
};

// JSON serialization of last memory usage stats; we keep it stringified
// so we don't actually change the memory usage stats (in terms of objects)
// of the JSRuntime we're profiling.
var lastMemoryUsage;

function analyzeRawProfilingData(data) {
  var graph = data.graph;
  var shapes = {};

  // Convert keys in the graph from strings to ints.
  // TODO: Can we get rid of this ridiculousness?
  var newGraph = {};
  for (id in graph) {
    newGraph[parseInt(id)] = graph[id];
  }
  graph = newGraph;

  var modules = 0;
  var moduleIds = [];
  var moduleObjs = {UNKNOWN: 0};
  for (name in data.namedObjects) {
    moduleObjs[name] = 0;
    moduleIds[data.namedObjects[name]] = name;
    modules++;
  }

  var count = 0;
  for (id in graph) {
    var parent = graph[id].parent;
    while (parent) {
      if (parent in moduleIds) {
        var name = moduleIds[parent];
        moduleObjs[name]++;
        break;
      }
      if (!(parent in graph)) {
        moduleObjs.UNKNOWN++;
        break;
      }
      parent = graph[parent].parent;
    }
    count++;
  }

  print("\nobject count is " + count + " in " + modules + " modules" +
        " (" + data.totalObjectCount + " across entire JS runtime)\n");
  if (lastMemoryUsage) {
    var last = JSON.parse(lastMemoryUsage);
    var diff = {
      moduleObjs: dictDiff(last.moduleObjs, moduleObjs),
      totalObjectClasses: dictDiff(last.totalObjectClasses,
                                   data.totalObjectClasses)
    };

    for (name in diff.moduleObjs)
      print("  " + diff.moduleObjs[name] + " in " + name + "\n");
    for (name in diff.totalObjectClasses)
      print("  " + diff.totalObjectClasses[name] + " instances of " +
            name + "\n");
  }
  lastMemoryUsage = JSON.stringify(
    {moduleObjs: moduleObjs,
     totalObjectClasses: data.totalObjectClasses}
  );
}

function dictDiff(last, curr) {
  var diff = {};

  for (name in last) {
    var result = (curr[name] || 0) - last[name];
    if (result)
      diff[name] = (result > 0 ? "+" : "") + result;
  }
  for (name in curr) {
    var result = curr[name] - (last[name] || 0);
    if (result)
      diff[name] = (result > 0 ? "+" : "") + result;
  }
  return diff;
}

function reportMemoryUsage() {
  memory.gc();
  sandbox.memory.gc();

  var mgr = Cc["@mozilla.org/memory-reporter-manager;1"]
            .getService(Ci.nsIMemoryReporterManager);
  var reporters = mgr.enumerateReporters();
  if (reporters.hasMoreElements())
    print("\n");
  while (reporters.hasMoreElements()) {
    var reporter = reporters.getNext();
    reporter.QueryInterface(Ci.nsIMemoryReporter);
    print(reporter.description + ": " + reporter.memoryUsed + "\n");
  }

  var weakrefs = [info.weakref.get()
                  for each (info in sandbox.memory.getObjects())];
  weakrefs = [weakref for each (weakref in weakrefs) if (weakref)];
  print("Tracked memory objects in testing sandbox: " +
        weakrefs.length + "\n");
}

var gWeakrefInfo;

function showResults() {
  memory.gc();

  if (gWeakrefInfo) {
    gWeakrefInfo.forEach(
      function(info) {
        var ref = info.weakref.get();
        if (ref !== null) {
          var data = ref.__url__ ? ref.__url__ : ref;
          var warning = data == "[object Object]"
            ? "[object " + data.constructor.name + "(" +
              [p for (p in data)].join(", ") + ")]"
            : data;
          console.warn("LEAK", warning, info.bin);
        }
      }
    );
  }

  print("\n");
  var total = results.passed + results.failed;
  print(results.passed + " of " + total + " tests passed.\n");
  onDone(results);
}

function cleanup() {
  try {
    for (name in sandbox.sandboxes)
      sandbox.memory.track(sandbox.sandboxes[name].globalScope,
                           "module global scope: " + name);
    sandbox.memory.track(sandbox, "Cuddlefish Loader");

    if (profileMemory) {
      gWeakrefInfo = [{ weakref: info.weakref, bin: info.bin }
                      for each (info in sandbox.memory.getObjects())];
    }

    sandbox.unload();

    if (sandbox.console.errorsLogged && !results.failed) {
      results.failed++;
      console.error("warnings and/or errors were logged.");
    }

    if (consoleListener.errorsLogged && !results.failed) {
      console.warn(consoleListener.errorsLogged + " " +
                   "warnings or errors were logged to the " +
                   "platform's nsIConsoleService, which could " +
                   "be of no consequence; however, they could also " +
                   "be indicative of aberrant behavior.");
    }

    consoleListener.errorsLogged = 0;
    sandbox = null;

    memory.gc();
  } catch (e) {
    results.failed++;
    console.error("unload.send() threw an exception.");
    console.exception(e);
  };

  require("timer").setTimeout(showResults, 1);
}

function nextIteration(tests) {
  if (tests) {
    results.passed += tests.passed;
    results.failed += tests.failed;

    if (profileMemory)
      reportMemoryUsage();
    
    let testRun = [];
    for each (let test in tests.testRunSummary) {
      let testCopy = {};
      for (let info in test) {
        testCopy[info] = test[info];
      }
      testRun.push(testCopy);
    }

    results.testRuns.push(testRun);
    iterationsLeft--;
  }
  if (iterationsLeft)
    sandbox.require("unit-test").findAndRunTests({
      testOutOfProcess: packaging.enableE10s,
      testInProcess: true,
      fs: sandbox.fs,
      dirs: dirs,
      filter: filter,
      onDone: nextIteration
    });
  else
    require("timer").setTimeout(cleanup, 0);
}

var POINTLESS_ERRORS = [
  "Invalid chrome URI:",
  "OpenGL LayerManager Initialized Succesfully."
];

var consoleListener = {
  errorsLogged: 0,
  observe: function(object) {
    if (object instanceof Ci.nsIScriptError)
      this.errorsLogged++;
    var message = object.QueryInterface(Ci.nsIConsoleMessage).message;
    var pointless = [err for each (err in POINTLESS_ERRORS)
                         if (message.indexOf(err) == 0)];
    if (pointless.length == 0 && message)
      print("console: " + message + "\n");
  }
};

function TestRunnerConsole(base, options) {
  this.__proto__ = {
    errorsLogged: 0,
    warn: function warn() {
      this.errorsLogged++;
      base.warn.apply(base, arguments);
    },
    error: function error() {
      this.errorsLogged++;
      base.error.apply(base, arguments);
    },
    info: function info(first) {
      if (options.verbose)
        base.info.apply(base, arguments);
      else
        if (first == "pass:")
          print(".");
    },
    __proto__: base
  };
}

var runTests = exports.runTests = function runTests(options) {
  iterationsLeft = options.iterations;
  filter = options.filter;
  profileMemory = options.profileMemory;
  onDone = options.onDone;
  print = options.print;

  try {
    cService.registerListener(consoleListener);

    var cuddlefish = require("cuddlefish");
    var ptc = require("plain-text-console");
    var url = require("url");

    dirs = [url.toFilename(path)
            for each (path in options.rootPaths)];
    var console = new TestRunnerConsole(new ptc.PlainTextConsole(print),
                                        options);
    var globals = {packaging: packaging};

    var xulApp = require("xul-app");
    var xulRuntime = Cc["@mozilla.org/xre/app-info;1"]
                     .getService(Ci.nsIXULRuntime);

    print("Running tests on " + xulApp.name + " " + xulApp.version +
          "/Gecko " + xulApp.platformVersion + " (" + 
          xulApp.ID + ") under " +
          xulRuntime.OS + "/" + xulRuntime.XPCOMABI + ".\n");

    sandbox = new cuddlefish.Loader({console: console,
                                     globals: globals,
                                     packaging: packaging,
                                     __proto__: options});
    nextIteration();
  } catch (e) {
    print(require("traceback").format(e) + "\n" + e + "\n");
    onDone({passed: 0, failed: 1});
  }
};

require("unload").when(
  function() {
    cService.unregisterListener(consoleListener);
  });
