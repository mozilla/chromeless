This module contains functionality for byte input and output streams.

## Constructors ##

<code>byte-streams.**ByteReader**(*backingStream*)</code>

Creates a new binary input stream.  The stream is backed by a Mozilla
platform stream that provides the underlying data, such as an
`nsIFileInputStream`.

<code>byte-streams.**ByteWriter**(*backingStream*)</code>

Creates a new binary output stream.  The stream is backed by a Mozilla
platform stream that actually writes out the data, such as an
`nsIFileOutputStream`.

## ByteReader Objects ##

<code>ByteReader.**close**()</code>

Closes the stream.

<code>ByteReader.**read**(*numBytes*)</code>

Reads from the stream starting at its current position.  If the stream is
closed, an exception is thrown.

*numBytes* is the number of bytes to read.  If not specified, the
remainder of the entire stream is read.

Returns a string containing the bytes read.  If the stream is at EOF,
this method returns the empty string.

## ByteWriter Objects ##

<code>ByteWriter.**close**()</code>

Closes the stream.

<code>ByteWriter.**write**(*str*, *begin*, *end*)</code>

Writes to the stream.  If the stream is closed, an exception is thrown.
*begin* and *end* are optional and control the portion of *str* that is output.
If neither is specified, *str* is output in its entirety.  If only *begin* is
specified, the suffix begining at that index is output.  If both are
specified, the range <code>[*begin*, *end*)</code> is output.

*str* is the string to write.

*begin* is an optional argument specifying the index of *str* at which
to start output.

*end* is an optional argument specifying the index of *str* at which to end
output.  The byte at index `end - 1` is the last byte output.
