The `private-browsing` module allows you to access the private browsing service
- detecting if it is active and adding callbacks for transitioning into and out
of private browsing mode.

Private browsing is a singleton, so in most cases it will be easiest to store it
in a variable.

    var pb = require("private-browsing");


## Attributes ##

<code>private-browsing.**active**</code>

This is a boolean. You can read this attribute to determine if private browsing
mode is active. You can also set the attribute to enter or exit private browsing.

    // If private browsing is active, do something
    if (pb.active)
      doSomething();
    
    // Enter private browsing mode
    pb.active = true;
    
    // Exit private browsing mode
    pb.active = false;


## Callbacks ##

Transitioning into or out of private browsing mode causes a set of callbacks to be triggered.
The first callback happens before the transition actually starts. From this
callback, you can cancel the transition. The next callback happens immediately
after the mode has been transitioned. The third gets called after the browser
has restored the session. These will be explained in more detail below.


### Adding and Removing Callback Functions ###

The callbacks are stored as `collection`s, so there are a number of ways to access them.

    // Define our callback function
    function onStartCallback () { /* do something */ }
    
    // The simplest way will be simple assignment
    pb.onStart = onStartCallback;

    // Let's say we had another callback that we also wanted to run
    function onStartCallback2 () { /* do something */ }
    
    // We can add onStartCallback2 to the list very easily
    pb.onStart.add(onStartCallback2);
    
    // Alternatively, we can assign both at the same time
    pb.onStart = [onStartCallback, onStartCAllback2]
    
    // We can also remove callbacks.
    // If we want to just remove all of them, we can just assign an empty array
    pb.onStart = [];
    
    // We can also remove a specific callback.
    pb.onStart.remove(onStartCallback2);


### Available Callbacks ###

<code>private-browsing.**onBeforeStart**(*cancel*)</code>

Each `onBeforeStart` callback is called when something triggers the browser to
enter private browsing mode. **`cancel`** is a one-time-use function that can be
called if your code would like to prevent the browser from entering private
browsing. Calling `cancel` from outside of your callback will have no effect.

    pb.onBeforeStart = function (cancel) {
      // Do something and realize you need to prevent private browsing...
      cancel();
    }

<code>private-browsing.**onStart**()</code>

Each `onStart` callback is called when the browser has actually entered private
browsing mode. This only happens if nothing has cancelled the transition
(which can be done by you or other extensions).

<code>private-browsing.**onAfterStart**()</code>

Each `onAfterStart` callback is called after the browser has fully transitioned
into private browsing. While the other callbacks will be called synchronously,
this callback is asynchronous and will happen only after the private browsing
session has been loaded.

<code>private-browsing.**onBeforeStop**(*cancel*)</code>

Each `onBeforeStop` callback is called when something triggers the browser to
leave private browsing mode. Just like `onAfterStart`, *`cancel`* is a one-time-use
function that can be used to cancel the transition from private browsing mode.

<code>private-browsing.**onStop**()</code>

Each `onStop` callback is called when the browser has actually left private
browsing mode. This only happens if nothing has cancelled the transition
(which can be done by you or other extensions).

<code>private-browsing.**onAfterStop**()</code>
Each `onAfterStop` callback is called after the browser has fully transitioned
out of private browsing. While the other callbacks will be called synchronously,
this callback is asynchronous and will happen only after the browsing session
has been restored.


## Supported Applications ##

This module is available in all applications. However, only Firefox will ever
transition into or out of private browsing mode. For all other applications,
`pb.active` will always return `false`, and none of your callbacks will actually
be run.

