The `file` module provides access to the local filesystem.

`file.`**dirname**`(`*path*`)`

Returns the path of a file’s containing directory, albeit the parent directory if the file is a directory.

`file.`**list**`(`*path*`)`

Returns an array of files in the given directory.

`file.`**join**`(`*...*`)`

Takes a variable number of strings, joins them on the file system’s path separator, and returns the result.
