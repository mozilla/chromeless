
# Welcome to the Add-on SDK #

The Add-on SDK is designed to make it easy to develop Firefox add-ons.

It includes:

* a set of ***modules*** providing high-level JavaScript APIs which you can use
to create add-ons. These modules simplify tasks such as building a user
interface and interacting with the Web, and will help ensure your add-on
continues to work as new versions of the host application are released.

* a set of ***tools*** for creating, running, testing, and packaging add-ons

The documentation is divided into two parts: the Developer Guide and the
Package Reference. The Developer Guide is a collection of documents explaining
how to use the tools and APIs, while the Package Reference includes
detailed documentation for each module API.

## Developer Guide ##

* The [***Tutorial***](#guide/getting-started) is probably the best place to
start: it explains how to install the SDK, takes you through the process of
writing a simple add-on and introduces some of the main APIs.

* The ***Reference*** section provides some more in-depth documentation for
various aspects of the SDK.

* The ***Experimental*** section includes documentation of features which are
potentially useful to add-on developers but are not yet stabilised.

* The ***Internals*** section includes documentation which is more likely to
be useful to people extending the SDK itself than to add-on developers. In
particular, it contains important information for people developing modules
which require privileged access to browser objects such as the chrome. If you
are interested in helping to extend the SDK, then this section should be
useful.

## Package Reference ##

The Package Reference provides detailed API documentation for the modules
supplied in the SDK. The SDK follows the [CommonJS](http://www.commonjs.org/)
standard according to which modules - pieces of reusable JavaScript - are
collected into packages. There are two main packages.

* The ***addon-kit*** package provides high-level APIs for add-on developers.
Most of the needs of most add-on developers should be served by the modules
found here, and the bulk of the developer guide is dedicated to modules from
this package. Modules in this packages also don't require any special
privileges to run.

* The ***api-utils*** package provides low-level APIs. Most of the modules it
contains are intended for people writing certain specific types of add-ons, and
for people writing their own reusable modules. In particular it contains
modules that supply basic services, like messaging, for higher-level modules.
Many of the modules in this package require privileged access to the browser
chrome.

## Stability and Compatibility ##

The different categories listed above also reflect differences in the stability
of the different parts of the SDK.

Features and APIs documented in the ***Tutorial*** and ***Reference***
sections, and the modules in the ***addon-kit*** package, are relatively
stable. We intend to add new APIs here and extend existing ones, but will
avoid making incompatible changes to them unless absolutely necessary.

Features and APIs documented in the ***Experimental*** and ***Internals***
sections, and the modules in the ***api-utils*** package, are less stable and
we expect to make incompatible changes to them in future releases.
