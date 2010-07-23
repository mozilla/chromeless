<!-- contributed by Drew Willcoxon [adw@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->

The `text-streams` module provides streams for reading and writing text using
particular character encodings.

Constructors
------------

<code>textStreams.**TextReader**(*inputStream*, *charset*)</code>

Creates a buffered input stream that reads text from a backing stream using a
given text encoding.

*`inputStream`* is the backing stream and must be an
[`nsIInputStream`][nsIInputStream].  It must already be opened.

Text in *`inputStream`* is expected to be in the character encoding named by
*`charset`*.  If not given, "UTF-8" is assumed.  See
[`nsICharsetConverterManager.idl`][nsICharsetConverterManager] for documentation
on how to determine other valid values for this.

[nsIInputStream]: http://mxr.mozilla.org/mozilla-central/source/xpcom/io/nsIInputStream.idl
[nsICharsetConverterManager]: http://mxr.mozilla.org/mozilla-central/source/intl/uconv/idl/nsICharsetConverterManager.idl

<code>textStreams.**TextWriter**(*outputStream*, *charset*)</code>

Creates a buffered output stream that writes text to a backing stream using a
given text encoding.

*`outputStream`* is the backing stream and must be an
[`nsIOutputStream`][nsIOutputStream].  It must already be opened.

Text will be written to *`outputStream`* using the character encoding named by
*`charset`*.  If not given, "UTF-8" is assumed.  See
[`nsICharsetConverterManager.idl`][nsICharsetConverterManager] for documentation
on how to determine other valid values for this.

[nsIOutputStream]: http://mxr.mozilla.org/mozilla-central/source/xpcom/io/nsIOutputStream.idl


TextReader Objects
------------------

<code>TextReader.**closed**</code>

True if the stream is closed.

<code>TextReader.**close**()</code>

Closes both the stream and its backing stream.

<code>TextReader.**read**(*numChars*)</code>

Reads and returns a string from the stream.  If the stream is closed, an
exception is thrown.  *`numChars`* is the number of characters to read.  If not
given, the remainder of the stream is read.  If the stream is already at EOS,
the empty string is returned.


TextWriter Objects
------------------

<code>TextWriter.**closed**</code>

True if the stream is closed.

<code>TextWriter.**close**()</code>

Flushes the backing stream's buffer and closes both the stream and the backing
stream.  If the stream is already closed, an exception is thrown.

<code>TextWriter.**flush**()</code>

Flushes the backing stream's buffer.

<code>TextWriter.**write**(*str*)</code>

Writes a string to the stream.  If the stream is closed, an exception is thrown.

<code>TextWriter.**writeAsync**(*str*, *callback*)</code>

Writes a string on a background thread.  After the write completes, the backing
stream's buffer is flushed, and both the stream and the backing stream are
closed, also on the background thread.  If the stream is already closed, an
exception is thrown immediately.

*`callback`*, if given, must be a function.  It's called as `callback(error)`
 when the write completes.  `error` is an `Error` object or undefined if there
 was no error.  Inside *`callback`*, `this` is the `TextWriter` object.
