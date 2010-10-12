Jetpack Core provides a basic CommonJS infrastructure for
developing traditional XULRunner Extensions and applications. It is
the basis for Jetpack.

To address issues present in traditional Extension development,
Jetpack Core provides mechanisms for:

* writing and executing test cases, inspired by Python's [nose]
  package,
* tracking JS objects of interest to aid in memory profiling and leak
  detection,
* registering callbacks that perform cleanup tasks when modules are
  unloaded,
* easily reporting errors with full stack tracebacks.

Jetpack Core also has the following characteristics:

* Beautiful, concise documentation.
* A rigorous test suite ensuring that the library doesn't break as the
  Mozilla platform evolves.
* Solid developer ergonomics ensuring that developers can easily find
  out why something they're doing isn't working.

Jetpack Core is intended to be very small and only contain the bare
minimum of functionality that all extensions need.

  [nose]: http://code.google.com/p/python-nose/
