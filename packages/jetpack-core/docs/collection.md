The `collection` module provides a simple list-like class and utilities for
using it.  A collection is ordered, like an array, but its items are unique,
like a set.

## Constructors ##

<tt>collection.**Collection**(*array*)</tt>

Creates a new collection.  The collection is backed by an array.  If *array* is
given, it will be used as the backing array.  This way the caller can fully
control the collection.  Otherwise a new empty array will be used, and no one
but the collection will have access to it.

## Collection Objects ##

### Iteration ###

A collection object provides for...in-loop iteration.  Items are yielded in the
order they were added.  For example, the following code...

    var collection = require("collection");
    var c = new collection.Collection();
    c.add(1);
    c.add(2);
    c.add(3);
    for (item in c)
      console.log(item);

... would print this to the console:

    1
    2
    3

### Members ###

<tt>Collection.**length**</tt>

The number of items in the collection.

### Methods ###

<tt>Collection.**add**(*itemOrItems*)</tt>

Adds a single item or an array of items to the collection.  Any items already
contained in the collection are ignored.  The collection is returned.

<tt>Collection.**remove**(*itemOrItems*)</tt>

Removes a single item or an array of items from the collection.  Any items not
contained in the collection are ignored.  The collection is returned.

## Functions ##

<tt>collection.**addCollectionProperty**(*object*, *propertyName*, *backingArray*)</tt>

Adds a collection property to the given object.  Setting the property to a
scalar value empties the collection and adds the value.  Setting it to an array
empties the collection and adds all the items in the array.  The name of the
property will be *propertyName*.  *backingArray*, if given, will be used as the
collection's backing array.
