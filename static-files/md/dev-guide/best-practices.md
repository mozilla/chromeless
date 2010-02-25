Low-Level Jetpack API (LLJAPI) modules expose Mozilla platform
capabilities to client code. They are intended to have the following
characteristics:

<span class="aside">
For more information on the security aspects of Jetpack, see the
[Security Roadmap] appendix.
</span>

  * **Secure**. They must expose an interface that, when accounting for 
    secure encapsulation via [Chrome Object Wrappers], does not grant
    more authority to unprivileged client code than it claims to provide.
    For instance, this means that it should not be possible for an
    `XMLHttpRequest` implementation to somehow grant unprivileged code
    unfettered access to the user's filesystem.

  * **Easy to debug**.  It needs to be easy for a developer to figure
    out why something they're doing isn't working.  To this end,
    whenever an exception is raised by a Jetpack-based extension, it
    should be logged in a place that is specific to that
    extension--so that a developer can distinguish it from an error on
    a web page or in another extension, for instance. We also want it
    to be logged with a full stack traceback, which the Mozilla
    platform doesn't usually do.

  * **Reloadable**. A Jetpack-based extension can be asked to unload
    itself at any time, e.g. because the user decides to
    uninstall or disable the extension. In order to do this, 
    to keep track of the resources currently being used by
    the extension's code, and be ready to free them at a moment's
    notice.

  * **Side by Side**. Currently, Jetpack-based extensions actually
    operate in their own private instance of the Jetpack runtime.
    While this may be consolidated in the future to optimize resource
    use, it may still be the case that two different Jetpack-based
    extensions may need to use different versions of the same module.
    This means that multiple instances of different versions of
    the same module may exist in an application at once.

Creating best practices requires actually practicing, which the Jetpack team
hasn't been able to do a great deal of yet, since the platform is fairly new.

That said, the current best practices are illustrated well by the
[xhr module source code] and the [xhr module test suite].

  [Security Roadmap]: #guide/security-roadmap
  [xhr module source code]: api/packages/jetpack-core/lib/xhr.js
  [xhr module test suite]: api/packages/jetpack-core/tests/test-xhr.js
  [Chrome Object Wrappers]: https://wiki.mozilla.org/XPConnect_Chrome_Object_Wrapper
