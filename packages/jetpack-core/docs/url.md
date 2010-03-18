The <tt>url</tt> module provides functionality for the parsing and
retrieving of URLs.

<api name="toFilename">
@method
Attempts to convert the given URL to a native file path.  This
function will automatically attempt to resolve non-file protocols,
such as the <tt>resource:</tt> protocol, to their place on the file
system. An exception is raised if the URL can't be converted;
otherwise, the native file path is returned as a string.
@param url {string} The URL to be converted.
</api>

<api name="fromFilename">
@method
Converts the given native file path to a <tt>file:</tt> URL.
@param path {string}
</api>

<api name="resolve">
@method
Returns an absolute URL given a base URL and a relative URL.
@param base {string}
@param relative {boolean}
</api>

<api name="parse">
@method
Parses the URL and returns an object with following keys:
@returns {object}
  @prop {scheme} The name of the protocol in the URL.
  @prop {userPass} The username:password part of the URL; <tt>null</tt> if
  not present.
  @prop {host} The host of the URL, <tt>null</tt> if not present.
  @prop {port} The port number of the URL, <tt>null</tt> if none was
  specified.
  @prop {path} The path component of the URL.
@param url {string}
</api>
