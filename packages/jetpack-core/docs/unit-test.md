The `unit-test` module makes it easy to find and run unit tests.

## Test Runner Objects ##

Each function which represents a test case is passed a single argument
`test`, which represents the test runner.  It has the following
methods:

<code>test.**pass**([*message*])</code>

Marks a test as passing, with the given optional message.

<code>test.**fail**([*message*])</code>

Marks a test as failing, with the given optional message.

<code>test.**exception**(*e*)</code>

Marks a test as failing due to the given exception having been thrown.
This can be put in a `catch` clause.

<code>test.**assert**(*a*[, *message*])</code>

Ensures that *a* has a truthy value.  A test is marked as passing or
failing depending on the result, logging *message* with it.

<code>test.**assertEqual**(*a*, *b*[, *message*])</code>

Simply ensures that *a* `==` *b* without recursing into
*a* or *b*.  A test is marked as passing or failing depending on
the result, logging *message* with it.

<code>test.**assertNotEqual**(*a*, *b*[, *message*])</code>

Simply ensures that *a* `!=` *b* without recursing into
*a* or *b*.  A test is marked as passing or failing depending on
the result, logging *message* with it.

<code>test.**assertMatches**(*string*, *regexp*[, *message*])</code>

Ensures that the given string matches the given regular expression.
If it does, marks a test as passing, otherwise marks a test as
failing.  *message* is logged with the pass or fail.

<code>test.**assertRaises**(*func*, *predicate*[, *message*])</code>

Calls the function *func* with no arguments, expecting an exception
to be raised. If nothing is raised, marks the test as failing. If an
exception is raised, the exception's `message` property is
compared with *predicate*: if *predicate* is a string, then a
simple equality comparison is done with `message`. Otherwise,
if *predicate* is a regular expression, `message` is tested
against it. Depending on the outcome, a test is marked as passing or
failing, and *message* is logged.

<code>test.**waitUntilDone**([*timeout*])</code>

Puts the test runner into asynchronous testing mode, waiting up to
*timeout* milliseconds for `test.done()` to be called.  This
is intended for use in situations where a test suite schedules a
callback, calls `test.waitUntilDone`, and then calls
`test.done()` in the callback.

<code>test.**done**()</code>

Marks a test as being complete.  Assumes a previous call to
`test.waitUntilDone()`.

## Functions ##

<code>unit-test.**findAndRunTests**(*options*)</code>

*options* should contain the following properties:

<table>
  <tr>
    <td><code>dirs</code></td>
    <td>A list of absolute paths representing directories to search
    for tests in.  It's assumed that all of these directories are also
    in the module search path, i.e. any JS files found in them are
    SecurableModules that can be loaded via a call to
    <code>require()</code>.</td>
  </tr>
  <tr>
    <td><code>onDone</code></td>
    <td>A function to call when testing is complete.</td>
  </tr>
</table>

The list of directories is searched for SecurableModules that start
with the prefix `test-`.  Each module matching this criteria is
expected to export functions that are test cases or a suite of test
cases; each is called with a single argument, which is a Test Runner
Object.
