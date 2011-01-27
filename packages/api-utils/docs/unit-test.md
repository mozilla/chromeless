<!-- contributed by Atul Varma [atul@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->


The `unit-test` module makes it easy to find and run unit tests.

<api name="test">
@class
Each function which represents a test case is passed a single argument
`test`, which represents the test runner.

<api name="pass">
@method
  Marks a test as passing, with the given optional message.

@param [message] {string}
  Optional passing message.
</api>


<api name="fail">
@method
  Marks a test as failing, with the given optional message.

@param [message] {string}
  Optional failure message.
</api>


<api name="exception">
@method
  Marks a test as failing due to the given exception having been thrown.
  This can be put in a `catch` clause.

@param e {exception}
  An exception.
</api>

<api name="assert">
@method
  Ensures that `a` has a truthy value.

@param a {value}
  Value to verify.
@param [message] {string}
  The test is marked as passing or failing depending on the result, logging
  *message* with it.
</api>


<api name="assertEqual">
@method
  Simply ensures that `a == b` without recursing into `a` or `b`.

@param a {value}
  A value.

@param b {value}
  Another value.

@param [message] {string}
  The test is marked as passing or failing depending on the result, logging
  *message* with it.
</api>

<api name="assertNotEqual">
@method
  Simply ensures that `a != b` without recursing into `a` or `b`.

@param a {value}
  A value.

@param b {value}
  Another value.

@param [message] {string}
  The test is marked as passing or failing depending on the result, logging
  *message* with it.
</api>


<api name="assertMatches">
@method
  Ensures that the given string matches the given regular expression.
  If it does, marks a test as passing, otherwise marks a test as
  failing.

@param string {string}
  The string to test.

@param regexp {regexp}
  The string should match this regular expression.

@param [message] {string}
  The test is marked as passing or failing depending on the result, logging
  *message* with it.
</api>


<api name="assertRaises">
@method
  Calls the function `func` with no arguments, expecting an exception
  to be raised. If nothing is raised, marks the test as failing. If an
  exception is raised, the exception's `message` property is
  compared with `predicate`: if `predicate` is a string, then a
  simple equality comparison is done with `message`. Otherwise,
  if `predicate` is a regular expression, `message` is tested
  against it.

@param func {function}
  A function that should raise an exception when called.

@param predicate {string,regexp}
  A string or regular expression to compare to the exception's message.

@param [message] {string}
  Depending on the outcome, a test is marked as passing or failing, and
  *message* is logged.
</api>


<api name="waitUntilDone">
@method
  Puts the test runner into asynchronous testing mode, waiting up to
  *timeout* milliseconds for `test.done()` to be called.  This
  is intended for use in situations where a test suite schedules a
  callback, calls `test.waitUntilDone()`, and then calls
  `test.done()` in the callback.

@param [timeout] {integer}
  If this number of milliseconds elapses and `test.done()` has not yet been
  called, the test is marked as failing.
</api>

<api name="done">
@method
  Marks a test as being complete.  Assumes a previous call to
  `test.waitUntilDone()`.
</api>

</api>

<api name="findAndRunTests">
@function
  The list of directories is searched for SecurableModules that start
  with the prefix `test-`.  Each module matching this criteria is
  expected to export functions that are test cases or a suite of test
  cases; each is called with a single argument, which is a Test Runner
  Object.

@param options {object}
  An object with the following properties:
  @prop dirs {string}
    A list of absolute paths representing directories to search
    for tests in.  It's assumed that all of these directories are also
    in the module search path, i.e. any JS files found in them are
    SecurableModules that can be loaded via a call to
    `require()`.
  @prop onDone {function}
    A function to call when testing is complete.
</api>
