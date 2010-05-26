<!-- contributed by Drew Willcoxon [adw@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->

The `byte-streams` module contains functionality for byte input and output
streams.

## Constructors ##

<api name="ByteReader">
@constructor
Creates a new binary input stream.  The stream is backed by a Mozilla
platform stream that provides the underlying data, such as an
`nsIFileInputStream`.
@param backingStream {stream}
A Mozilla platform stream object.
</api>

<api name="ByteWriter">
@constructor
Creates a new binary output stream.  The stream is backed by a Mozilla
platform stream that actually writes out the data, such as an
`nsIFileOutputStream`.
@param backingStream {stream}
A Mozilla platform stream object.
</api>

## ByteReader Objects ##

<api name="close">
@method
Closes the stream.
</api>

<api name="read">
@method
Reads from the stream starting at its current position.  If the stream is
closed, an exception is thrown.

@param [numBytes] {number}
The number of bytes to read.  If not specified, the remainder of the entire
stream is read.

@returns {string}
Returns a string containing the bytes read.  If the stream is at EOF,
this method returns the empty string.
</api>

## ByteWriter Objects ##

<api name="close">
@method
Closes the stream.
</api>

<api name="write">
@method
Writes to the stream.  If the stream is closed, an exception is thrown.
*`begin`* and *`end`* are optional and control the portion of `str` that is
output.  If neither is specified, `str` is output in its entirety.  If only
*`begin`* is specified, the suffix beginning at that index is output.  If both
are specified, the range <code>[<em>begin</em>, <em>end</em>)</code> is output.

@param str {string}
The string to write.

@param [begin] {number}
*`begin`* is an optional argument specifying the index of `str` at which
to start output.

@param [end] {number}
*`end`* is an optional argument specifying the index of `str` at which to end
output.  The byte at index <code><em>end</em> - 1</code> is the last byte
output.
</api>
