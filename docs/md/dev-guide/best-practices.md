<span class="aside">
Note that creating best practices requires actually practicing, which
the development team hasn't been able to do a great deal of yet, since the
platform is fairly new.
</span>

Low-level modules expose Mozilla platform
capabilities to client code. They are intended to have the following
characteristics:

  * **Easy to debug**.  It needs to be easy for a developer to figure
    out why something they're doing isn't working.  To this end,
    whenever an exception is raised by a SDK-based extension, it
    should be logged in a place that is specific to that
    extension--so that a developer can distinguish it from an error on
    a web page or in another extension, for instance. We also want it
    to be logged with a full stack traceback, which the Mozilla
    platform doesn't usually do.

  * **Reloadable**. A SDK-based extension can be asked to unload
    itself at any time, e.g. because the user decides to
    uninstall or disable the extension. In order to do this, 
    to keep track of the resources currently being used by
    the extension's code, and be ready to free them at a moment's
    notice.

  * **Side by Side**. Currently, SDK-based extensions actually
    operate in their own private instance of the SDK runtime.
    While this may be consolidated in the future to optimize resource
    use, it may still be the case that two different SDK-based
    extensions may need to use different versions of the same module.
    This means that multiple instances of different versions of
    the same module may exist in an application at once.

<span class="aside">
For more information on the security aspects of the Add-on SDK, see the
[Security Roadmap] appendix.
</span>

  * **Security Conscious**. Because the precise details of the SDK's
    security model are still unknown, we can't yet make low-level
    modules truly secure. However, we can document the *intended*
    security characteristics of low-level modules, which will
    aid downstream development.

    At minimum, each low-level module should document:

    1. The level of authority (or range of authority levels) that its
       use implies
    2. A threat model
    3. Potential ways in which the module's functionality might
       be attenuated to reduce authority

The current best practices are illustrated well by the [xhr module
documentation], the [xhr module source code], and the [xhr module test
suite].

  [Security Roadmap]: #guide/security-roadmap
  [xhr module documentation]: #module/api-utils/xhr
  [xhr module source code]: packages/api-utils/lib/xhr.js
  [xhr module test suite]: packages/api-utils/tests/test-xhr.js
  [Chrome Object Wrappers]: https://wiki.mozilla.org/XPConnect_Chrome_Object_Wrapper
