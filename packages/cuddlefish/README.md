The Cuddlefish Minilib provides a basic CommonJS infrastructure for
developing traditional XULRunner Extensions and applications. It is
the basis for Jetpack.

To address issues present in traditional Extension development,
Cuddlefish provides mechanisms for:

* writing and executing test cases, inspired by Python's [nose]
  package,
* tracking JS objects of interest to aid in memory profiling and leak
  detection,
* registering callbacks that perform cleanup tasks when modules are
  unloaded,
* easily reporting errors with full stack tracebacks,
* dropping-in optional third-party packages or CommonJS modules.

Cuddlefish should also have the following characteristics:

* Beautiful, concise documentation.
* A rigorous test suite ensuring that Cuddlefish doesn't break as the
  Mozilla platform evolves.
* Solid developer ergonomics ensuring that developers can easily find
  out why something they're doing isn't working.

As is implied by the word "minilib", Cuddlefish is intended to be very
small and only contain the bare minimum of functionality that all
extensions need. This means, for instance, that a module that wraps
clipboard access will not be included in Cuddlefish&mdash;though such
modules may certainly be bundled with an extension and easily loaded
using Cuddlefish.

  [nose]: http://code.google.com/p/python-nose/
