The `file` module provides access to the local filesystem.

<code>file.**dirname**(*path*)</code>

Returns the path of a file’s containing directory, albeit the parent directory
if the file is a directory.

<code>file.**exists**(*path*)</code>

Returns true if a file exists at the given path and false otherwise.

<code>file.**join**(*...*)</code>

Takes a variable number of strings, joins them on the file system’s path
separator, and returns the result.

<code>file.**list**(*path*)</code>

Returns an array of files in the given directory.

<code>file.**mkpath**(*path*)</code>

Makes a new directory named by the given path.  Any subdirectories that do not
exist are also created.  `mkpath` can be called multiple times on the same path.

<code>file.**open**(*path*, *mode*)</code>

Returns a byte stream providing access to the file at the given path.

*`mode`* is an optional string, each character of which describes a
characteristic of the returned stream.  If the string contains `"r"`, the file
is opened in read-only mode.  `"w"` opens the file in write-only mode.  `"b"`
opens the file in binary mode.  If `"b"` is not present, the file is opened in
text mode, and its contents are assumed to be UTF-8.  If *`mode`* is not given,
`"r"` is assumed, and the file is opened in read-only text mode.

Opened files should always be closed after use by calling `close` on the
returned stream.

<code>file.**read**(*path*)</code>

Opens the file at the given path in text mode and returns a string containing
its entire contents.

<code>file.**remove**(*path*)</code>

Removes the file at the given path from the file system.  To remove directories,
use `rmdir`.

<code>file.**rmdir**(*path*)</code>

Removes the directory at the given path from the file system.  If the directory
is not empty, an exception is thrown.
