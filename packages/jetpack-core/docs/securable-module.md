The <tt>securable-module</tt> module allows for the recursive loading
and sandboxing of [CommonJS Modules] (formerly called
SecurableModules). This allows, for instance, the creation of "mini
platforms" that manage the sandboxed evaluation of code.

## Loader Objects ##

Loader objects encapsulate the sandboxed loading of SecurableModules
and the execution of code that relies upon them.

<tt>Loader.**runScript**(*options*)</tt>

Runs JavaScript code in the context of the Loader.  *options* is an
object with the following keys:

<table>
  <tr>
    <td><tt>contents</tt></td>
    <td>A string of JavaScript code.</td>
  </tr>
  <tr>
    <td><tt>filename</tt></td>
    <td>An absolute URL naming the file from which the code
    originates; useful for error reporting and debugging. If omitted,
    this option defaults to <tt>"&lt;string&gt;"</tt>.</td>
  </tr>
  <tr>
    <td><tt>lineNo</tt></td>
    <td>An integer representing the line from the file which the
    beginning of the code corresponds to. If ommitted, this option
    defaults to <tt>1</tt>.</td>
  </tr>
  <tr>
    <td><tt>jsVersion</tt></td>
    <td>A string representing the JavaScript version that the code
    should be interpreted under. If omitted, this options defaults to
    the latest version of JavaScript supported by the platform.</td>
  </tr>
</table>

This method returns the most recent value evaluated by the given code.

<tt>Loader.**runScript**(*code*)</tt>

If *code* is a string of JavaScript code, this is a convenient
shorthand for <tt>Loader.runScript({contents: code}}</tt>.

<tt>Loader.**require**(*module*)</tt>

This loads the given module name using the standard <tt>require()</tt>
semantics and returns the loaded module.

## Functions ##

<tt>securable-module.**Loader**(*options*)</tt>

Creates a new SecurableModule Loader. *options* is an object with
the following keys:

<table>
  <tr>
    <td><tt>rootPaths</tt></td>
    <td>A list of absolute URLs that will be searched, in order, for
    SecurableModules when <tt>require()</tt> is called by any code
    executing within the context of the Loader.</td>
  </tr>
  <tr>
    <td><tt>rootPath</tt></td>
    <td>A single absolute URL; this is a convenience option,
    synonymous with setting <tt>rootPaths</tt> to an array containing
    a single URL.</td>
  </tr>
  <tr>
    <td><tt>defaultPrincipal</tt></td>
    <td>A string representing the default principal given to any code
    that is executed by the Loader.  This can be <tt>"system"</tt>, in
    which case code executed has full chrome access (including access
    to the <tt>Components</tt> object which allows it to access the
    Mozilla platform unrestricted).
    Alternatively, it can be a URL, such as <tt>"http://www.foo.com"</tt>,
    in which case it is treated like web content. If left unspecified,
    the default value of this option is <tt>"http://www.mozilla.org"</tt>.
    </td>
  </tr>
  <tr>
    <td><tt>globals</tt></td>
    <td>An object containing the names and values of all variables
    that will be injected into the global scope of all code executed
    by the Loader.</td>
  </tr>
</table>

  [CommonJS Modules]: http://wiki.commonjs.org/wiki/Modules/1.0
