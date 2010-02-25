<span class="aside">Security is really hard.</span>

While the current implementation of Jetpack technology is
fully-privileged, it won't always be.

At an architectural level, this means that we need to make a
distinction between modules that are *low-level* and ones that are
*high-level*.

<span class="aside">
For information on writing Low-Level Jetpack API Modules, see the
[LLJAPI Best Practices] appendix.
</span>

**Low-level Jetpack API modules** absolutely require chrome-privileged
access to globals like `Components` in order to access resources like
the network, sensitive user data, or UI elements. A quintessential
example of a LLJAPI module would be [xhr](#module/jetpack-core/xhr).

High-level modules, which we call **Unprivileged Jetpack modules**,
just import the LLJAPI modules through a call to `require()` and don't
actually need direct, unfettered access to the Mozilla platform
itself. An example of a high-level module would be a convenience
wrapper for `XMLHttpRequest` that provides an interface like
[jQuery.get()]. Another example would be an actual extension that uses
both LLJAPI and unprivileged Jetpack modules to do something useful.

When our architecture is set up in this way, we have the opportunity
to combine Jetpack's module-loading framework with cutting-edge
Mozilla platform security technologies like [Chrome Object Wrappers]
to securitize the way extension code behaves. LLJAPI modules
execute with chrome privileges, but their exports are wrapped in a way
that protects their internal state from outside clients, allowing
unprivileged modules to execute with limited authority.

Optionally, the interfaces of LLJAPI modules can also be attenuated
by trusted code that applies further security restrictions. Imagine a
wrapper for `XMLHttpRequest` that filters calls to `open()` based on a
white-list of domains provided in an extension's `package.json`
manifest, for instance.

<span class="aside">
Note that this approach does *not* mean we can simply forget about
security. The act of distinguishing between low and high-level modules
still needs to be made during the design phase, through threat
modeling and similar techniques.
</span>

This approach has a number of advantages:

  * It effectively "flattens" Mozilla's complex security system of
    principals, privileges, and wrappers into a far simpler and
    easier-to-understand system reminiscent of an [Object Capability
    Model].

  * It provides a path for community members to create their own
    LLJAPI modules, which can be given security reviews and
    approved for use in extensions. This allows the Mozilla community
    to organically "grow" a secure platform by exposing parts of the
    underlying privileged platform into it, rather than being
    constrained by a top-down security model that enumerates what's
    possible and what isn't.

  * It decouples the implementation of security from the design of
    usable APIs. Since unprivileged modules can actually execute in
    chrome and non-chrome contexts, it allows us to try out different
    kinds of high-level APIs and actually use them in real extensions
    without blocking on a complete, bug-free implementation of a
    secure platform.

  [Object Capability Model]: http://en.wikipedia.org/wiki/Object-capability_model
  [jQuery.get()]: http://docs.jquery.com/Ajax/jQuery.get
  [Chrome Object Wrappers]: https://wiki.mozilla.org/XPConnect_Chrome_Object_Wrapper
  [LLJAPI Best Practices]: #guide/best-practices
