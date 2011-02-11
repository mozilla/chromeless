## Embedding Web Content ##

A core feature of chromeless is that it allows application code which
runs with escalated priviledges (like the ability to interact with the
file system), to safely embed untrusted web content.  The way that
this is achieved is by embedding web content in iframes.  An iframe
which is a direct child of the application code is special in chromeless.
Specifically it emits non-standard events that allow app code a priviledged
view into its current load state, as well as allowing the app code to
inspect and change its javascript environment.

To help understand the terms we use for different parts, and how they fit
together, here's a simple diagram:

XXX

### Tracking IFrame Load Events

XXX

### Accessing IFrame Details

Typically, with normal web content, there are many restrictions on what a
parent frame may see or manipulate within a child frame that's loaded from
a different origin.

XXX
