The <tt>traceback</tt> module contains functionality similar to
Python's [traceback] module.

## JSON Traceback Objects ##

Tracebacks are stored in JSON format. The stack is represented as an
array in which the most recent stack frame is the last element; each
element thus represents a stack frame and has the following keys:

<table>
  <tr>
    <td><tt>filename</tt></td>
    <td>The name of the file that the stack frame takes place in.</td>
  </tr>
  <tr>
    <td><tt>lineNo</tt></td>
    <td>The line number is being executed at the stack frame.</td>
  </tr>
  <tr>
    <td><tt>funcName</tt></td>
    <td>The name of the function being executed at the stack frame, or
    <tt>null</tt> if the function is anonymous or the stack frame is
    being executed in a top-level script or module.</td>
  </tr>
</table>

## Functions ##

<tt>traceback.**fromException**(*exception*)</tt>

Attempts to extract the traceback from *exception*, returning the
JSON representation of the traceback or <tt>null</tt> if no traceback
could be extracted.

<tt>traceback.**get**()</tt>

Returns the JSON representation of the stack at the point that this
function is called.

<tt>traceback.**format**([*tbOrException*])</tt>

Given a JSON representation of the stack or an exception instance,
returns a formatted plain text representation of it, similar to
Python's formatted stack tracebacks.  If no argument is provided, the
stack at the point this function is called is used.

  [traceback]: http://docs.python.org/library/traceback.html
