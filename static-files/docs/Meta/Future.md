# Enabling Experimental Jetpack Features #

The proposed method for accessing Jetpack features that are still in development and may be added in the future is inspired by python's [future module][1]. In Python, you can call
[1]: http://docs.python.org/library/__future__.html

`from __future__ import foo`

which adds the functionality that `foo` yields to the script. In Jetpack, we propse adding a new function to the base namespace called `importFromFuture`.

## Methods ##

== method ==
import
: Imports the requested experimental feature into the script.
== params ==
stringMountPath
: String that enumerates where, starting from the `jetpack` base, the feature will be mounted. To get a list of mount paths that are available, see the method below.
	* type: string
	* required: true

Here is an example of how to import a feature (the clipboard) from the future.

~~~~{.javascript}
jetpack.future.import("clipboard");
~~~~

The goal here is to be able to remove the `jetpack.future.import()` call when the feature has been formally accepted into the core without additionally changing the script (barring any other changes made during integration).

== method ==
list
: Returns an array of the set of potential `stringMountPath` as used in `jetpack.future.import()`.
 * returns: array

This is an example of how to get this array. A quick way of displaying the list is to write it to the console.log.

~~~~{.javascript}
var list = jetpack.future.list();
console.log(list);
~~~~

Open the firebug console to view.