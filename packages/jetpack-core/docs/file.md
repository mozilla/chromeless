The `file` module provides access to the local filesystem.

<tt>file.**dirname**(*path*)</tt>

Returns the path of a file’s containing directory, albeit the parent directory if the file is a directory.

<tt>file.**list**(*path*)</tt>

Returns an array of files in the given directory.

<tt>file.**join**(*...*)</tt>

Takes a variable number of strings, joins them on the file system’s path separator, and returns the result.
