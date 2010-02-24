The <tt>url</tt> module provides functionality for the parsing and
retrieving of URLs.

<tt>url.**toFilename**(*url*)</tt>

Attempts to convert the given URL to a native file path.  This
function will automatically attempt to resolve non-file protocols,
such as the <tt>resource:</tt> protocol, to their place on the file
system. An exception is raised if the URL can't be converted;
otherwise, the native file path is returned as a string.

<tt>url.**fromFilename**(*path*)</tt>

Converts the given native file path to a <tt>file:</tt> URL.

<tt>url.**resolve**(*base*, *relative*)</tt>

Returns an absolute URL given a base URL and a relative URL.

<tt>url.**parse**(*url*)</tt>

Parses the URL and returns an object with following keys:

<table>
  <tr>
    <td><tt>scheme</tt></td>
    <td>The name of the protocol in the URL.</td>
  </tr>
  <tr>
    <td><tt>userPass</tt></td>
    <td>The username:password part of the URL; <tt>null</tt> if not
    present.</td>
  </tr>
  <tr>
    <td><tt>host</tt></td>
    <td>The host of the URL, <tt>null</tt> if not present.</td>
  </tr>
  <tr>
    <td><tt>port</tt></td>
    <td>The port number of the URL, <tt>null</tt> if none was
    specified.</td>
  </tr>
  <tr>
    <td><tt>path</tt></td>
    <td>The path component of the URL.</td>
  </tr>
</td>
