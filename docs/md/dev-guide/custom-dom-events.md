Chromeless introduces several non-standard DOM events which allow application
code increased priviledges and visibility.  These custom events are camel cased
with the prefix `Chromeless` to make it obvious that they're non-standard and 
prevent collisions with other events.  In addition to standard web events,
chromless provides:

**ChromlessLoadStart** - Dispatched on an `iframe` at the time when navigation
starts.  This event is delivered before any network interaction takes place.
The `url` property of the event contains the url that will be loaded into the
iframe.

**ChromlessDOMSetup** - Dispatched on an `iframe` after a document is setup, but
before any scripts have a chance to execute.  This is a great time to inject
javascript APIs in the child if you so desire.

**ChromelessSecurityChange** - An event raised upon completion of a top level document
load.  Fired after all resources have been loaded, or if the load has been
programmatically stopped. `.state` is one of *`insecure`*, *`broken`*, or *`secure`*
(get [more info](https://developer.mozilla.org/en/nsIWebProgressListener#State_Security_Flags)
on states), 
while `.strength` is *`.low`*, *`.medium`*, or *`high`* (
[read more](https://developer.mozilla.org/en/nsIWebProgressListener#Security_Strength_Flags)
about *strengths*).

**ChromlessLoadProgress** - Displatched on an `iframe` while content being loaded.
The `.percentage` property contains an integer which indicates load percentage.

**ChromelessStatusChanged** - Displatched on an `iframe` and relays human
readable text which gives information about the progress in loading a
document and its dependent resources.  `.message` contains the textual
content of the event.

**ChromelessLoadStop** - An event raised upon completion of a top level document
load.  Fired after all resources have been loaded, or if the load has been
programmatically stopped.

**ChromelessTitleChanged** - Dispatched on an `iframe` when its title is updated.
`.title` contains the new page title.
