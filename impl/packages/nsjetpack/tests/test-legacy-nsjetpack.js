// These are "legacy" tests taken from the Jetpack prototype's test suite.
// They were originally written to run in xpcshell, then ported to run
// in a hidden window, and then ported to run in cuddlefish.

var {Cc,Ci,Cu} = require("chrome");

var WrapperTests = {
  runTests: function(test, doOutput) {
    function output(msg) {
      if (doOutput)
        dump(msg + "\n");
    }

    output("\nRunning wrapper test suite.\n");

    try {
      var endpoint = require("nsjetpack").get();
    } catch (e if e.message &&
             /component not available for OS\/ABI/.test(e.message)) {
      // If the binary component isn't available, just skip these
      // tests.
      test.pass("Binary component does not exist.  Skipping tests.");
      return;
    }
    for (name in endpoint) {
      if (endpoint.hasOwnProperty(name)) {
        var obj = endpoint[name];
        if (typeof(obj) == "function")
          // This is really gross, but there doesn't seem to be
          // any clean way to dynamically add variables to the local
          // scope.
          eval("var " + name + " = endpoint." + name + ";" );
      }
    }

    function assert(a, msg) {
      if (!a)
        test.fail(msg);
      else
        test.pass(msg);
    }

    function assertEqual(a, b) {
      test.assertEqual(a, b);
    }

    function assertThrows(func, validator, msg) {
      try {
        func();
      } catch (e) {
        switch (typeof(validator)) {
        case "string":
          test.assertEqual(e.toString(), validator);
          break;
        default:
          test.fail("Not sure what to do with " + validator);
        }
        return;
      }
      test.fail(msg);
    }

    (function testObjectsWithWrappersAsProtosWork() {
       var membrane = {
         resolve: function(wrappee, wrapper, name) {
           wrapper[name] = true;
           return wrapper;
         },
         getProperty: function(wrappee, wrapper, name, defaultValue) {
           return 5;
         }
       };
       var thing = wrap({}, membrane);
       assertEqual(thing.blarg, 5);
       var strangeThing = new Object();
       strangeThing.__proto__ = thing;
       assertEqual(strangeThing.blarg, 5);
     })();

    var resolver = {
      resolve: function(wrappee, wrapper, name) {
        output("resolve on " + name);
        if (name == 'blarg') {
          output('resolving blarg now!');
          wrapper.blarg = 'boop';
          return wrapper;
        }
        if (name == 'toString') {
          wrapper.toString = function() { return "[my wrapped object]"; };
          return wrapper;
        }
      },

      enumerateCalled: false,

      enumerate: function(wrappee, wrapper) {
        this.enumerateCalled = true;
        yield "i am enumerating!";
        yield 2;
      },

      addProperty: function(wrappee, wrapper, name, defaultValue) {
        if (name == 'foo')
          return defaultValue + 1;
        return defaultValue;
      },

      delProperty: function(wrappee, wrapper, name) {
        if (name == 'foo') {
          output('delProperty ' + name);
          // TODO: We'd like to just return false here to indicate that
          // the property can't be deleted, as specified in MDC, but this
          // doesn't seem to do anything, so we'll throw an exception.
          throw new Error('no wai');
        }
        return true;
      },

      getProperty: function(wrappee, wrapper, name, defaultValue) {
        output('get ' + name);
        if (name == "nom")
          return "nowai";
        return defaultValue;
      },

      setProperty: function(wrappee, wrapper, name, defaultValue) {
        output('set ' + name);
        if (name == 'foo')
          return defaultValue + 1;
        return defaultValue;
      },

      iteratorObject: function(wrappee, wrapper, keysonly) {
        if (keysonly) {
          function keyIterator() {
            for (name in wrappee)
              yield name;
          }
          return keyIterator();
        } else {
          function keyValueIterator() {
            for (name in wrappee)
              yield [name, wrappee[name]];
          }
          return keyValueIterator();
        }
      }
    };

    function dummy() {}

    assertEqual(typeof(wrap(dummy, {})), "function");
    assertEqual(typeof(wrap(XPCSafeJSObjectWrapper(dummy), {})),
                "object");
    assertEqual(typeof(wrap(unwrapAny(XPCSafeJSObjectWrapper(dummy)), {})),
                "function");
    assertEqual(typeof(unwrapAny(wrap(XPCSafeJSObjectWrapper(dummy), {}))),
                "function");
    assertEqual(unwrapAny(dummy), null);

    assertEqual(getClassName({}), "Object");
    assertEqual(getClassName(wrap(dummy, {})), "FlexibleWrapper");
    assertEqual(getClassName(XPCSafeJSObjectWrapper({})),
                "XPCSafeJSObjectWrapper");

    var object = {a: 5};
    var wrapped = wrap(object, resolver);

    for each (name in ["__parent__", "__proto__", "prototype", "constructor"]) {
      assert(wrapped[name] === undefined,
             name + " property of wrapped object should be undefined");
    }

    assertEqual(typeof(wrapped), "object");
    assertEqual(wrapped, "[my wrapped object]");

    assertEqual(wrapped.blarg, "boop");
    assertEqual(wrapped.blarg, "boop");

    for (name in wrapped) {}
    for each (obj in wrapped) {}
    var iter = Iterator(wrapped);
    assertEqual(iter.next()[0], "a");

    assertEqual(resolver.enumerateCalled, false);
    assertEqual(enumerate(wrapped)[0], "i am enumerating!");
    assertEqual(resolver.enumerateCalled, true);

    // TODO: Somehow create a test that calls the enumerate hook. It used to be
    // automatically called when doing a for..in loop, but when the iteratorObject
    // hook was added, it got called instead.

    assertThrows(function() {
                   var wrapper = wrap({}, {});
                   for (name in wrapper) {}
                 },
                 "Error: iteratorObject() is unimplemented.",
                 "Iterating over a wrapper with no defined iterator should " +
                 "throw an error.");

    wrapped.foo = 2;
    assertEqual(wrapped.foo, 4);

    assertThrows(function() { delete wrapped.foo; },
                 "Error: no wai",
                 "property delete handlers should work");

    assertEqual(wrapped.foo, 4);

    assertEqual(wrapped.nom, "nowai");

    assertEqual(wrapped, wrapped);

    assert(wrapped === wrapped, "a wrapper instance must be === to itself");
    assert(wrap(object, resolver) === wrap(object, resolver),
           "a wrapper instance must be === to another wrapper instance of " +
           "the same target object");

    assert(getWrapper(wrap(object, resolver)) == resolver,
           "getWrapper() must == the original wrapper.");
    assert(getWrapper(wrap(object, resolver)) === resolver,
           "getWrapper() must === the original wrapper.");
    assert(getWrapper({}) === null,
           "getWrapper() of a non-wrappedo object should return null.");

    assert(unwrap(wrap(object, resolver)) == object,
           "unwrap() must == the original object.");
    assert(unwrap(wrap(object, resolver)) === object,
           "unwrap() must === the original object.");
    assertEqual(unwrap(wrapped), "[object Object]");
    assert(unwrap(wrapped).blarg === undefined,
           "unwrap() should return the original object.");
    assert(unwrap(unwrap(wrapped)) === null,
           "calling unwrap() on an already-unwrapped object " +
           "should return null.");

    assert(wrap({}, resolver) !== wrap({}, resolver),
           "a wrapper instance must be !== to another wrapper instance of " +
           "a different target object");

    var sandbox = new Cu.Sandbox("http://www.google.com");
    sandbox.wrapped = wrapped;
    assertEqual(Cu.evalInSandbox("wrapped.nom", sandbox), "nowai");

    assertEqual(wrap(
                  {},
                  {equality: function(wrappee, wrapper, v) {
                     return v.blah == "beans";
                   }}),
                {blah: "beans"});

    wrapped = wrap({}, {});
    assertEqual(wrapped.blargle, undefined);

    function testGCWorks() {
      var resolver = {
        getProperty: function(wrappee, wrapper, name, defaultValue) {
          if (name == "foo")
            return "bar";
          return defaultValue;
        }
      };
      var obj = new Object();

      var weakResolver = Cu.getWeakReference(resolver);
      var weakObj = Cu.getWeakReference(obj);

      var wrapped = wrap(obj, resolver);
      resolver = undefined;
      obj = undefined;

      Cu.forceGC();

      assert(weakResolver.get(), "weakResolver should still exist");
      assert(weakObj.get(), "weakObj should still exist");
      assertEqual(wrapped.foo, "bar");
      wrapped = undefined;
      Cu.forceGC();
      assertEqual(weakResolver.get(), null);
      assertEqual(weakObj.get(), null);
    }

    testGCWorks();

    assertThrows(function() {
                   var funcWrapper = wrap(function(x) { return x + 1; }, {});
                   funcWrapper(1);
                 },
                 "Error: Either the object isn't callable, or the " +
                 "caller doesn't have permission to call it.",
                 "By default, wrappers shouldn't allow function calls.");

    var callingWrapper = {
      call: function(wrappee, wrapper, thisObj, args) {
        try {
          var result = wrappee.apply(thisObj, args);
          return result;
        } catch (e) {
          output("uhoh: " + e);
          return undefined;
        }
      },
      getProperty: function(wrappee, wrapper, name, defaultValue) {
        if (name == "__parent__")
          return undefined;
        if (name in wrappee)
          return wrap(wrappee[name], callingWrapper);
      },
      convert: function(wrappee, wrapper, type) {
        if (type == "object")
          return wrapper;
        if (type == "function") {
          // TODO: Not sure how secure doing this is in the general case.  Could
          // the function below somehow be passed into untrusted code?  If so, said
          // code could look at the function's __parent__ and get access to our
          // global TCB's namespace.
          return function() {
            return wrappee.apply(this, arguments);
          };
        }
        return wrappee.toString();
      }
    };

    var funcWrapper = wrap(function(x) { return x + 1; }, callingWrapper);

    assertEqual(typeof(funcWrapper), "function");
    if ("__parent__" in funcWrapper)
      assertEqual(funcWrapper.__parent__, undefined);
    assertEqual(funcWrapper(1), 2);
    if ("__parent__" in funcWrapper.call)
      assertEqual(funcWrapper.call.__parent__, undefined);
    assertEqual(funcWrapper.call(this, 1), 2);
    assertEqual(funcWrapper.apply(this, [1]), 2);

    assertThrows(function() {
                   var Constructor = wrap(function(x) { this.x = 1; }, {});
                   var obj = new Constructor(1);
                 },
                 "Error: Either the object can't be used as a constructor, or " +
                 "the caller doesn't have permission to use it.",
                 "By default, wrappers shouldn't allow for constructors.");

    var Constructor = wrap(function(x) { this.x = 1; },
                           {construct: function(wrappee, wrapper,
                                                thisObj, args) {
                             thisObj.x = args[0];
                             return thisObj;
                           }});
    assertEqual((new Constructor(1)).x, 1);

    wrapped = wrap({},
                   {convert: function(wrappee, wrapper, type) {
                      // TODO: Not sure why type is always "undefined".
                      if (type == "undefined")
                        return 5;
                      throw new Error("unknown type: " + type);
                    }});
    assert(3 + wrapped == 8);
    assert("hi" + wrapped == "hi5");

    // A silly wrapper that masks all non-string values in the wrapped object,
    // except for sub-objects, and that uppercases all string values.
    function SillyWrapper(wrappee) {
      this.wrappee = wrappee;
      return wrap(wrappee, this);
    }

    SillyWrapper.prototype = {
      getProperty: function(wrappee, wrapper, name, defaultValue) {
        assertEqual(this.wrappee, wrappee);
        var value = this.wrappee[name];
        switch (typeof(value)) {
        case "string":
          return value.toUpperCase();
        case "object":
          return new SillyWrapper(value);
        default:
          return undefined;
        }
      },
      equality: function(wrappee, wrapper, other) {
        return wrappee === other;
      }
    };

    wrapped = new SillyWrapper({boop: 'blarg',
                                number: 5,
                                sub: {flarg: 'arg'}});
    assertEqual(wrapped.boop, 'BLARG');
    assertEqual(wrapped.number, undefined);
    assertEqual(wrapped.sub.flarg, 'ARG');
    assert(wrapped.sub == wrapped.sub);
    assert(wrapped.sub === wrapped.sub);

    function testReadOnlyDomWrapper() {
      function WrappedDomFunction(node, func) {
        this.node = node;
        this.func = func;
        return wrap(func, this);
      }
      WrappedDomFunction.prototype = {
        call: function call(wrappee, wrapper, thisObj, args) {
          var safeArgs = [];
          for (var i = 0; i < args.length; i++)
            safeArgs.push(XPCSafeJSObjectWrapper(args[i]));
          var result = this.func.apply(this.node, safeArgs);
          switch (typeof(result)) {
          case "string":
            return result;
          default:
            return undefined;
          }
        }
      };
      function ReadOnlyDomWrapper(node) {
        this.node = node;
        return wrap(node, this);
      }
      ReadOnlyDomWrapper.prototype = {
        accessibleFunctions: {getAttribute: true},
        getProperty: function(wrappee, wrapper, name, defaultValue) {
          var value = this.node[name];
          switch (typeof(value)) {
          case "string":
            return value;
          case "object":
            return new ReadOnlyDomWrapper(value);
          case "function":
            if (name in this.accessibleFunctions)
              return new WrappedDomFunction(this.node, value);
            throw new Error("Sorry, you can't access that function.");
          default:
            return undefined;
          }
        },
        setProperty: function(wrappee, wrapper, name, defaultValue) {
          throw new Error("Sorry, this DOM is read-only.");
        }
      };

      var wrapped = new ReadOnlyDomWrapper(document.getElementById("test"));
      assertEqual(wrapped.innerHTML, "This is test <b>HTML</b>.");
      assertEqual(wrapped.style.display, "none");
      assertEqual(wrapped.firstChild.nodeValue, "This is test ");
      assertThrows(
        function() { wrapped.innerHTML = "blah"; },
        "Error: Sorry, this DOM is read-only."
      );
      assertThrows(
        function() { wrapped.setAttribute('blarg', 'fnarg'); },
        "Error: Sorry, you can't access that function."
      );

      var sandbox = new Cu.Sandbox("http://www.google.com");
      sandbox.wrapped = wrapped;
      assertEqual(
        Cu.evalInSandbox("wrapped.innerHTML", sandbox),
        "This is test <b>HTML</b>."
      );
      assertEqual(
        Cu.evalInSandbox("wrapped.style.display", sandbox),
        "none"
      );
      assertEqual(
        Cu.evalInSandbox("wrapped.getAttribute('id');", sandbox),
        "test"
      );
      assertThrows(
        function() {
          Cu.evalInSandbox("wrapped.setAttribute('blarg', 'fnarg');",
                           sandbox);
        },
        "Error: Sorry, you can't access that function."
      );

    }

    // TODO: Use the hidden window on this.
    // testReadOnlyDomWrapper();

    // SEAL TESTS

    (function testSeal() {
       var obj = {boop: 1};
       seal(obj);
       assertEqual(obj.boop, 1);
       assertThrows(
         function() {
           obj.boop = 5;
         },
         "Error: obj.boop is read-only"
       );
       assertEqual(obj.boop, 1);
     })();

    // MEMORY PROFILING TESTS

    function runMemoryProfilingTest(func, namedObjects, argument) {
      function injectErrorReportingIntoContext(global) {
        // This function is called by the profiling runtime whenever an
        // uncaught exception occurs.
        global.handleError = function handleError() {
          printTraceback(lastExceptionTraceback);
          print(lastException);
        };

        // This function uses the Python-inspired traceback functionality of the
        // playground to print a stack trace that looks much like Python's.
        function printTraceback(frame) {
          print("Traceback (most recent call last):");
          if (frame === undefined)
            frame = stack();
          var lines = [];
          while (frame) {
            var line = ('  File "' + frame.filename + '", line ' +
                        frame.lineNo + ', in ' + frame.functionName);
            lines.splice(0, 0, line);
            frame = frame.caller;
          }
          print(lines.join('\n'));
        }
      }

      var code = injectErrorReportingIntoContext.toString();

      // Remove newlines from error reporting code so that the function
      // code we put after it retains its original line numbering.
      code = "(" + code.replace(/\n/g, ";") + ")(this);";
      code += "setGCZeal(2);";
      code += "(" + func.toString() + ")();";

      var funcInfo = functionInfo(func);

      return profileMemory(code, funcInfo.filename, funcInfo.lineNumber,
                           namedObjects, argument);
    }

    // This function's source code is injected into the separate JS
    // runtime of the memory profiler.
    function visitObjects(global) {
      // Change this to '2' to have this test take insanely long on
      // debug builds.
      setGCZeal(0);
      var visited = {};
      var visitedCount = 0;
      var namedObjects = getNamedObjects();
      var leftToVisit = [namedObjects[name] for (name in namedObjects)];
      if (leftToVisit.length == 0)
        leftToVisit = getGCRoots();
      while (leftToVisit.length > 0) {
        var id = leftToVisit.pop();
        if (!(id in visited)) {
          visited[id] = true;
          visitedCount++;
          var parent = getObjectParent(id);
          var info = getObjectInfo(id);
          if (info) {
            leftToVisit = leftToVisit.concat(info.children);
            if (info.nativeClass == "Object") {
              getObjectProperties(id, false);
              getObjectProperties(id, true);
            }
          }
        }
      }

      var table = getObjectTable();
      for (id in table) {
        if (!(id in visited)) {
          visitedCount++;
          var info = getObjectInfo(parseInt(id));
          if (info && info.nativeClass == "Object") {
            getObjectProperties(id, false);
            getObjectProperties(id, true);
          }
        }
      }

      //print("Successfully visited " + visitedCount + " objects.");
    }

    assert(
      functionInfo(visitObjects).filename.indexOf("test-legacy") > 0,
      "functionInfo() must contain accurate filename component."
    );

    assert(
      functionInfo(visitObjects).lineNumber > 0,
      "functionInfo() must contain accurate line number component."
    );

    profileMemory("var inf = getObjectProperty('blarg', 'hi');" +
                  "if (inf.hi != 'sup') throw new Error()",
                  "<string>", 1,
                  {blarg: {hi: 'sup'}});

    profileMemory("var inf = getObjectProperty('blarg', 'hi');" +
                  "if (typeof(inf.hi) != 'number') throw new Error()",
                  "<string>", 1,
                  {blarg: {hi: {foo: 1}}});

    profileMemory("var inf = getObjectProperty('blarg', 'hi');" +
                  "if (inf.hi) throw new Error()",
                  "<string>", 1,
                  {blarg: {}});

    profileMemory("var inf = getObjectProperty('blarg', 'hi');" +
                  "if (inf !== null) throw new Error()",
                  "<string>", 1,
                  {blarg: undefined});

    profileMemory("if (!getObjectInfo('blarg')) throw new Error()",
                  "<string>", 1,
                  {blarg: {}});

    profileMemory("if (getObjectInfo('oof')) throw new Error()",
                  "<string>");

    assertThrows(function() {
                   profileMemory("function handleError() {}; " +
                                 "iAmBadCode();", "<string>");
                 },
                 "Error: Profiling failed.",
                 "Profiling bad code should raise an exception.");

    output("Now profiling memory.");

    function getBrowserWindows() {
      var windows = {};
      var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);
      var enumerator = wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        if (win.gBrowser) {
          var browser = win.gBrowser;
          for (var i = 0; i < browser.browsers.length; i++) {
            var page = browser.browsers[i];
            var location = page.contentWindow.location;
            var name = location.href;
            while (name in windows) {
              name += "_";
            }
            windows[name] = page.contentWindow.wrappedJSObject;
          }
        }
      }
      return windows;
    }

    if (endpoint.makeCOW) {
      output("Running COW tests.");
      var cow = makeCOW(function blarp() {});
      assertEqual(getClassName(cow), "ChromeObjectWrapper");
    } else
      output("Skipping COW tests.");

    assertEqual(runMemoryProfilingTest(function() { return argument; },
                                       {}, "blah"), "blah");

    // TODO: This one is kind of weird, but mostly we're just doing it
    // to make sure we don't segfault.
    assertEqual(runMemoryProfilingTest(function() { return argument; },
                                       {}), "undefined");

    assertEqual(runMemoryProfilingTest(function() { return 1; }), 1);
    assertEqual(runMemoryProfilingTest(function() { return 'foo'; }), 'foo');

    runMemoryProfilingTest(visitObjects, getBrowserWindows());

    output("Done profiling memory.");

    output("All tests passed!");
  }
};

exports.runLegacyTests = function runLegacyTests(test) {
  WrapperTests.runTests(test, false);
};
