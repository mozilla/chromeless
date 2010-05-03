The `file` module provides access to the local filesystem.

<code>file.**dirname**(*path*)</code>

Returns the path of a file’s containing directory, albeit the parent directory if the file is a directory.

<code>file.**exists**(*path*)</code>

Returns true if a file exists at the given path and false otherwise.

<code>file.**join**(*...*)</code>

Takes a variable number of strings, joins them on the file system’s path separator, and returns the result.

<code>file.**list**(*path*)</code>

Returns an array of files in the given directory.

<code>file.**open**(*path*, *mode*)</code>

Returns a byte stream providing access to the file at the given path.

*mode* is an optional string describing the characteristics of the returned stream; currently only `"r"` and `"w"` are supported.  `"r"` opens the file in read-only mode and causes a `ByteReader` to be returned.  `"w"` opens the file in write-only mode and causes a `ByteWriter` to be returned.  If *mode* is undefined, `"r"` is assumed.

Opened files should always be closed after use by calling `close` on the returned stream.

<code>file.**read**(*path*)</code>

Returns a string containing the entire contents of the file at the given path.

<code>file.**remove**(*path*)</code>

Removes the file at the given path from the file system.
