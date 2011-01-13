<span class="aside">
Terminology is important.  Here's a glossary of terms used for the SDK
so all developers speak the same language.
</span>

__Add-on__: A software package that adds functionality to a Mozilla application,
which can be built with either Mozilla's traditional add-on platform or the SDK.

__Add-on SDK__: A toolchain and associated applications for developing add-ons.

__CFX__: A command-line build, testing, and packaging tool for SDK-based code.

__CommonJS__: A specification for a cross-platform JavaScript module
system and standard library.  [Web site](http://commonjs.org/).

__Extension__: Synonym for Add-on.

__Globals__: The set of global variables and objects provided
to all modules, such as `console` and `memory`. Includes
CommonJS globals like `require` and standard JavaScript globals such
as `Array` and `Math`.

<span class="aside">
For more information on Low-Level Modules, see the
[Low-Level Module Best Practices] appendix.
</span>

__API Utils__: A small, self-contained set of low-level modules that forms
the base functionality for the SDK. The library can be "bootstrapped" into
any Mozilla application or extension.

__Jetpack Prototype__: A Mozilla Labs experiment that predated and inspired
the SDK. The SDK incorporates many ideas and some code from the prototype.

__Loader__: An object capable of finding, evaluating, and
exposing CommonJS modules to each other in a given security context,
while providing each module with necessary globals and
enforcing security boundaries between the modules as necessary. It's
entirely possible for Loaders to create new Loaders.

__Low-Level Module__: A module with the following properties:

  * Has "chrome" access to the Mozilla platform (e.g. `Components.classes`)
    and all globals.
  * Is reloadable without leaking memory.
  * Logs full exception tracebacks originating from client-provided
    callbacks (i.e., does not allow the exceptions to propagate into
    Mozilla platform code).
  * Can exist side-by-side with multiple instances and versions of
    itself.
  * Contains documentation on security concerns and threat modeling.

__Module__: A CommonJS module that is either a Low-Level Module
or an Unprivileged Module.

__Package__: A directory structure containing modules,
documentation, tests, and related metadata. If a package contains
a program and includes proper metadata, it can be built into
a Mozilla application or extension.

__Program__: A module named `main` that optionally exports
a `main()` function.  This module is intended either to start an application for
an end-user or add features to an existing application.

__Unprivileged Module__: A CommonJS module that may be run
without unrestricted access to the Mozilla platform, and which may use
all applicable globals that don't require chrome privileges.

  [Low-Level Module Best Practices]: #guide/best-practices
