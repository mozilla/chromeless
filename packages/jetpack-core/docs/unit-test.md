The <tt>unit-test</tt> module makes it easy to find and run unit tests.

## Test Runner Objects ##

Each function which represents a test case is passed a single argument
<tt>test</tt>, which represents the test runner.  It has the following
methods:

<tt>test.**pass**([*message*])</tt>

Marks a test as passing, with the given optional message.

<tt>test.**fail**([*message*])</tt>

Marks a test as failing, with the given optional message.

<tt>test.**exception**(*e*)</tt>

Marks a test as failing due to the given exception having been thrown.
This can be put in a <tt>catch</tt> clause.

<tt>test.**assert**(*a*[, *message*])</tt>

Ensures that *a* has a truthy value.  A test is marked as passing or
failing depending on the result, logging *message* with it.

<tt>test.**assertEqual**(*a*, *b*[, *message*])</tt>

Simply ensures that *a* <tt>==</tt> *b* without recursing into
*a* or *b*.  A test is marked as passing or failing depending on
the result, logging *message* with it.

<tt>test.**assertNotEqual**(*a*, *b*[, *message*])</tt>

Simply ensures that *a* <tt>!=</tt> *b* without recursing into
*a* or *b*.  A test is marked as passing or failing depending on
the result, logging *message* with it.

<tt>test.**assertMatches**(*string*, *regexp*[, *message*])</tt>

Ensures that the given string matches the given regular expression.
If it does, marks a test as passing, otherwise marks a test as
failing.  *message* is logged with the pass or fail.

<tt>test.**assertRaises**(*func*, *predicate*[, *message*])</tt>

Calls the function *func* with no arguments, expecting an exception
to be raised. If nothing is raised, marks the test as failing. If an
exception is raised, the exception's <tt>message</tt> property is
compared with *predicate*: if *predicate* is a string, then a
simple equality comparison is done with <tt>message</tt>. Otherwise,
if *predicate* is a regular expression, <tt>message</tt> is tested
against it. Depending on the outcome, a test is marked as passing or
failing, and *message* is logged.

<tt>test.**waitUntilDone**([*timeout*])</tt>

Puts the test runner into asynchronous testing mode, waiting up to
*timeout* milliseconds for <tt>test.done()</tt> to be called.  This
is intended for use in situations where a test suite schedules a
callback, calls <tt>test.waitUntilDone</tt>, and then calls
<tt>test.done()</tt> in the callback.

<tt>test.**done**()</tt>

Marks a test as being complete.  Assumes a previous call to
<tt>test.waitUntilDone()</tt>.

## Functions ##

<tt>unit-test.**findAndRunTests**(*options*)</tt>

*options* should contain the following properties:

<table>
  <tr>
    <td><tt>dirs</tt></td>
    <td>A list of absolute paths representing directories to search
    for tests in.  It's assumed that all of these directories are also
    in the module search path, i.e. any JS files found in them are
    SecurableModules that can be loaded via a call to
    <tt>require()</tt>.</td>
  </tr>
  <tr>
    <td><tt>onDone</tt></td>
    <td>A function to call when testing is complete.</td>
  </tr>
</table>

The list of directories is searched for SecurableModules that start
with the prefix <tt>test-</tt>.  Each module matching this criteria is
expected to export functions that are test cases or a suite of test
cases; each is called with a single argument, which is a Test Runner
Object.
