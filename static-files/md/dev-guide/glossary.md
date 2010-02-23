Terminology is important.  Here's a glossary of terms used for the SDK
so all developers speak the same language.

__CommonJS__: A specification for a cross-platform JavaScript module
system and standard library.  [Web site](http://commonjs.org/).

__Addon__: An XPInstall package (.XPI file) that adds functionality to
a Mozilla application. It can include traditional addons such as
AdBlock Plus, as well as extensions built with Jetpack. Extensions
built with Jetpack, however, will eventually support install/upgrade
without reboot, as well as a robust security model.

__Extension__: Synonym for Addon.

__Jetpack__: A CommonJS-based framework and toolchain used to develop
secure Mozilla applications and extensions with Web technologies. Not
to be confused with the Jetpack Prototype, which is a completely
different animal.

__Jetpack Prototype__: A Firefox extension released in May 2009 which
explored using Web technologies to enhance the browser (e.g., HTML,
CSS and JavaScript), with the goal of allowing anyone who can build a
Web site to participate in making the Web a better place to work,
communicate and play. Not to be confused with Jetpack.

__Jetpack Core__: A small, self-contained set of Awesome Jetpack
Chrome Modules that form the base functionality for Jetpack. The Core
can actually be "bootstrapped" into any Mozilla application or
extension.

__Jetpack Globals__: The set of global variables and objects provided
to all Cuddlefish Modules, such as `console` and `memory`. Includes
CommonJS globals like `require` and standard JavaScript globals such
as `Array` and `Math`.

__Jetpack Chrome Module__: A CommonJS module which requires full
access to the Mozilla platform (e.g., `Components.classes`) to
function properly. It also has access to all Jetpack Globals.

__Awesome Jetpack Chrome Module__: A Jetpack Chrome Module with the
following properties:

  * Unloadable with no memory leaks.
  * Logs full exception tracebacks on callbacks originating from Mozilla
    platform code.
  * Exports functionality whose interfaces are fully decoupled from XPCOM.
  * Has a full suite of functional and unit tests.

__Jetpack Securable Module__: A CommonJS module that may be run
without unrestricted access to the Mozilla platform, and which may use
all applicable Jetpack Globals that don't require chrome privileges.

__Jetpack Module__: A CommonJS module that is either a Jetpack Chrome
Module or a Jetpack Securable Module.

__Jetpack Capability__: A Jetpack Chrome Module exposing a standard
interface that allows Mozilla platform functionality to be safely
exposed to Jetpack Securable Modules.

__Jetpack Loader__: An object capable of finding, evaluating, and
exposing CommonJS modules to each other in a given security context,
while providing each module with necessary Jetpack Globals and
exposing Jetpack Capabilities to the modules as necessary. It's
entirely possible for Loaders to create new Loaders.

__CFX__: A command-line build, testing, and packaging tool for
Jetpack-based code.

__Jetpack Package__: A directory structure containing Jetpack modules,
documentation, tests, and related metadata.

__Jetpack XPI__: A build target of the CFX tool that, when loaded as
an extension by a supported Mozilla application, bootstraps a Jetpack
Loader and executes a Jetpack Program.

__Jetpack Program__: A Jetpack Module that exports a `main()` function.

__Jetpack Platform Library__: A set of Awesome Jetpack Chrome Modules
that expose the functionality of the Mozilla Platform (Gecko).
