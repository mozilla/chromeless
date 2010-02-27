This module contains functionality for byte input and output streams.

## Constructors ##

<tt>byte-streams.**ByteReader**(*backingStream*)</tt>

Creates a new binary input stream.  The stream is backed by a Mozilla
platform stream that provides the underlying data, such as an
`nsIFileInputStream`.

<tt>byte-streams.**ByteWriter**(*backingStream*)</tt>

Creates a new binary output stream.  The stream is backed by a Mozilla
platform stream that actually writes out the data, such as an
`nsIFileOutputStream`.

## ByteReader Objects ##

<tt>ByteReader.**close**()</tt>

Closes the stream.

<tt>ByteReader.**read**(*numBytes*)</tt>

Reads from the stream starting at its current position.  If the stream is
closed, an exception is thrown.

*numBytes* is the number of bytes to read.  If not specified, the
remainder of the entire stream is read.

Returns a string containing the bytes read.  If the stream is at EOF,
this method returns the empty string.

## ByteWriter Objects ##

<tt>ByteWriter.**close**()</tt>

Closes the stream.

<tt>ByteWriter.**write**(*str*, *begin*, *end*)</tt>

Writes to the stream.  If the stream is closed, an exception is thrown.
*begin* and *end* are optional and control the portion of *str* that is output.
If neither is specified, *str* is output in its entirety.  If only *begin* is
specified, the suffix begining at that index is output.  If both are
specified, the range <tt>[*begin*, *end*)</tt> is output.

*str* is the string to write.

*begin* is an optional argument specifying the index of *str* at which
to start output.

*end* is an optional argument specifying the index of *str* at which to end
output.  The byte at index `end - 1` is the last byte output.
