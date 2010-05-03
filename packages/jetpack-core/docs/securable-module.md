The `securable-module` module allows for the recursive loading
and sandboxing of [CommonJS Modules] (formerly called
SecurableModules). This allows, for instance, the creation of "mini
platforms" that manage the sandboxed evaluation of code.

## Loader Objects ##

Loader objects encapsulate the sandboxed loading of SecurableModules
and the execution of code that relies upon them.

<code>Loader.**runScript**(*options*)</code>

Runs JavaScript code in the context of the Loader.  *options* is an
object with the following keys:

<table>
  <tr>
    <td><code>contents</code></td>
    <td>A string of JavaScript code.</td>
  </tr>
  <tr>
    <td><code>filename</code></td>
    <td>An absolute URL naming the file from which the code
    originates; useful for error reporting and debugging. If omitted,
    this option defaults to <code>"&lt;string&gt;"</code>.</td>
  </tr>
  <tr>
    <td><code>lineNo</code></td>
    <td>An integer representing the line from the file which the
    beginning of the code corresponds to. If ommitted, this option
    defaults to <code>1</code>.</td>
  </tr>
  <tr>
    <td><code>jsVersion</code></td>
    <td>A string representing the JavaScript version that the code
    should be interpreted under. If omitted, this options defaults to
    the latest version of JavaScript supported by the platform.</td>
  </tr>
</table>

This method returns the most recent value evaluated by the given code.

<code>Loader.**runScript**(*code*)</code>

If *code* is a string of JavaScript code, this is a convenient
shorthand for `Loader.runScript({contents: code}}`.

<code>Loader.**require**(*module*)</code>

This loads the given module name using the standard `require()`
semantics and returns the loaded module.

## Functions ##

<code>securable-module.**Loader**(*options*)</code>

Creates a new SecurableModule Loader. *options* is an object with
the following keys:

<table>
  <tr>
    <td><code>rootPaths</code></td>
    <td>A list of absolute URLs that will be searched, in order, for
    SecurableModules when <code>require()</code> is called by any code
    executing within the context of the Loader.</td>
  </tr>
  <tr>
    <td><code>rootPath</code></td>
    <td>A single absolute URL; this is a convenience option,
    synonymous with setting <code>rootPaths</code> to an array containing
    a single URL.</td>
  </tr>
  <tr>
    <td><code>defaultPrincipal</code></td>
    <td>A string representing the default principal given to any code
    that is executed by the Loader.  This can be <code>"system"</code>, in
    which case code executed has full chrome access (including access
    to the <code>Components</code> object which allows it to access the
    Mozilla platform unrestricted).
    Alternatively, it can be a URL, such as <code>"http://www.foo.com"</code>,
    in which case it is treated like web content. If left unspecified,
    the default value of this option is <code>"http://www.mozilla.org"</code>.
    </td>
  </tr>
  <tr>
    <td><code>globals</code></td>
    <td>An object containing the names and values of all variables
    that will be injected into the global scope of all code executed
    by the Loader.</td>
  </tr>
</table>

  [CommonJS Modules]: http://wiki.commonjs.org/wiki/Modules/1.0
