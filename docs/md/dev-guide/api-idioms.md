## Constructors ##

Many SDK modules export constructors that create object instances for use
by add-on code.

A constructor takes a single argument, an object typically referred to as
`options` and supplied as an object literal listing values for named object
properties. So you will generally see objects constructed using the following
pattern:

    var sdkModule = require("sdk-module");

    var mySdkObject = sdkModule.sdkObject({
      property1: value1,
      property2: value2
    });

## Events ##

The SDK supports event-driven programming: objects which are event emitters
can emit events such as pages loading, windows opening and user interactions.

Add-on developers can register listeners with event emitters and are then
notified when the events occur.

To learn more about events, see the [Working with Events](#guide/events) page.

## Content Scripting ##

Several modules need to interact directly with web content, either web content
they host themselves (such as the [`panel`](#module/addon-kit/panel) module) or
web content hosted by the browser (such as the
[`page-mod`](#module/addon-kit/page-mod)).

These modules follow a common pattern in which the code
that actually interacts with the content is executed as a separate script
called a content script. The content script and the main add-on script
communicate using an asynchronous message-passing mechanism.

Objects that implement this scheme include properties that specify which
content scripts should be run and when.

To learn more about content scripts, see the [Working with Content Scripts
](#guide/web-content) page.

<br>
**Next**: [module overview](#guide/api-modules).
