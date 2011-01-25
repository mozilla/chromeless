/**
 * A test of generation of documentation for nested classes.
 * (test data is a snapshot in time of a url parsing library)
 */
/**
 * @function fromPath
 * build a URL from a filename.
 * @param {string} path The path to convert.
 * @returns {string}
 * A string representation of a URL.
 */
/**
 * @function toPath
 * build a filename from a url.
 * @param {string} path The path to convert.
 * @returns {string}
 * A string representation of a URL.
 */
/**
 * @class URL
 * A class which parses a url and exposes its various
 * components separately.
 */
/**
 * @constructor
 *
 * The URL constructor creates an object that represents a URL,  verifying that
 * the provided string is a valid URL in the process.
 *
 * @param {string} url A string to be converted into a URL.
 * @param {string} [base] A optional base url which will be used to resolve the
 * `url` argument if it is a relative url.
 *
 * @throws If `source` is not a valid URI.
 */
/**
 * @property scheme {string} 
 * The name of the protocol in the URL.
 */
/**
 * @property userPass {string} 
 * The username:password part of the URL, `null` if not present.
 */
/**
 * @property host {string} 
 * The host of the URL, `null` if not present.
 */
/**
 * @property port {integer} 
 * The port number of the URL, `null` if none was specified.
 */
/**
 * @property path {string} 
 * The path component of the URL.
 */
/**
 * @function toString
 * Converts a URL to a string.
 * @returns {string} The URL as a string.
 */
/** @endclass */
