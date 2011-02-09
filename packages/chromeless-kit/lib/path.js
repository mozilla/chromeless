/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Initial Developer of the Original Code is
 * Alexandre Poirot.
 * Portions created by the Initial Developer are Copyright (C) 2010-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Lloyd Hilaiel <lloyd@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * A module that exposes abstract operations on file paths.  Functions
 * in this module operate on path strings, but do not ever interact with
 * the file system.  For reading/writing files, see [file].  For other
 * filesystem operations, see [fs].
 */

function validPathPart(p, keepBlanks) {
  return typeof p === 'string' && (p || keepBlanks);
}

const {Cc,Ci} = require("chrome");
/* XXX: higher level lib avail for platform info? */
const runtime = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);
const SEPARATOR = runtime.OS=="WINNT"?'\\':'/';
const SPLIT_REGEXP = runtime.OS=="WINNT"?/^|\\(?!$)/:/^|\/(?!$)/;
const REPLACE_LAST_REGEXP= runtime.OS=="WINNT"?/\\+$/:/\/+$/;

/**
 * joins any number of path components with the platform appropriate
 * path separator.
 * @params {strings} A variable number of parameters to be joined
 * @returns {string} The joined path
 */
exports.join = function() {
  var args = Array.prototype.slice.call(arguments);
  var joined = exports.normalizeArray(args).join(SEPARATOR);
  return joined;
};

/**
 * normalizes a path and splits it into an array of path components
 * @param path {string} A path to split
 * @returns {array} Path components.
 */
exports.split = function(path, keepBlanks) {
  // (lth) not documenting keepBlanks for now.  it seems an unnecessary
  // knob.
  if (keepBlanks === undefined) keepBlanks = false;
  // split based on /, but only if that / is not at the start or end.
  return exports.normalizeArray(path.split(SPLIT_REGEXP), keepBlanks);
};


function cleanArray(parts, keepBlanks) {
  var i = 0;
  var l = parts.length - 1;
  var stripped = false;

  // strip leading empty args
  while (i < l && !validPathPart(parts[i], keepBlanks)) {
    stripped = true;
    i++;
  }

  // strip tailing empty args
  while (l >= i && !validPathPart(parts[l], keepBlanks)) {
    stripped = true;
    l--;
  }

  if (stripped) {
    // if l chopped all the way back to i, then this is empty
    parts = Array.prototype.slice.call(parts, i, l + 1);
  }

  return parts.filter(function(p) { return validPathPart(p, keepBlanks) })
              .join(SEPARATOR)
              .split(SPLIT_REGEXP);
}


/**
 * normalizes an array of path components, properly reducing entries such as
 * '..' and blank paths.
 * @param components {array} Path components.
 * @returns {array} Normalized path components.
 */
exports.normalizeArray = function(original, keepBlanks) {
  if (keepBlanks === undefined) keepBlanks = false;

  var parts = cleanArray(original, keepBlanks);
  if (!parts.length || (parts.length === 1 && !parts[0])) return ['.'];

  // now we're fully ready to rock.
  // leading/trailing invalids have been stripped off.
  // if it comes in starting with a slash, or ending with a slash,
  var leadingSlash = (parts[0].charAt(0) === SEPARATOR);

  if (leadingSlash) parts[0] = parts[0].substr(1);
  var last = parts.slice(-1)[0];
  var tailingSlash = (last.substr(-1) === SEPARATOR);
  if (tailingSlash) parts[parts.length - 1] = last.slice(0, -1);
  var directories = [];
  var prev;
  for (var i = 0, l = parts.length - 1; i <= l; i++) {
    var directory = parts[i];

    // if it's blank, and we're not keeping blanks, then skip it.
    if (directory === '' && !keepBlanks) continue;

    // if it's a dot, then skip it
    if (directory === '.' && (directories.length ||
        (i === 0 && !(tailingSlash && i === l)) ||
        (i === 0 && leadingSlash))) continue;

    // if we're dealing with an absolute path, then discard ..s that go
    // above that the base.
    if (leadingSlash && directories.length === 0 && directory === '..') {
      continue;
    }
    // trying to go up a dir
    if (directory === '..' && directories.length && prev !== '..' &&
        prev !== undefined) {
      directories.pop();
      prev = directories.slice(-1)[0];
    } else {
      directories.push(directory);
      prev = directory;
    }
  }
  if (!directories.length) {
    directories = [leadingSlash || tailingSlash ? '' : '.'];
  }
  var last = directories.slice(-1)[0];
  if (tailingSlash && last.substr(-1) !== SEPARATOR) {
    directories[directories.length - 1] += SEPARATOR;
  }
  if (leadingSlash && directories[0].charAt(0) !== SEPARATOR) {
    if (directories[0] === '.') directories[0] = '';
    directories[0] = SEPARATOR + directories[0];
  }
  return directories;
};


/**
 * normalizes a path.
 * @param path {string} The path to normalize.
 * @returns {stribg} A normalized path.
 */
exports.normalize = function(path) {
  return exports.join(exports.split(path));
};

/**
 * Given a path, extract the *directory name* component.  For instance,
 * `dirname("/foo/bar/baz.txt") --> "/foo/bar"`.
 *
 * *Note: this function operates on strings alone, and will not interact with
 * the file system.*
 * @params {string} path A filesystem path.
 * @returns {string} The directory part of the path.
 */
exports.dirname = function(path) {
  if (path.length > 1 && SEPARATOR === path[path.length - 1]) {
    path = path.replace(REPLACE_LAST_REGEXP, '');
  }
  var lastSlash = path.lastIndexOf(SEPARATOR);
  switch (lastSlash) {
    case -1:
      return '.';
    case 0:
      return SEPARATOR;
    default:
      return path.substring(0, lastSlash);
  }
};

/**
 * Given a path, extract the filename component.  For instance,
 * `basename("/foo/bar/baz.txt") --> "baz.txt"`.  If an extension
 * argument is provided, and matches the extension present in the
 * path, it will be removed: `basename("/foo/bar/baz.txt", ".txt") --> "baz"`
 *
 * *Note: this function operates on strings alone, and will not interact with
 * the file system.*
 * @params {string} path A filesystem path.
 * @params {string} [ext] An extension string, if present and matches the
 *                  path, will be removed from the resulting filename. 
 * @returns {string} The filename component of the path.
 */
exports.basename = function(path, ext) {
  var f = path.substr(path.lastIndexOf(SEPARATOR) + 1);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

/**
 * Return the extension of a path:
 * `extname("/foo/bar/baz.txt") --> ".txt"`.  If an extension
 * argument is provided, and matches the extension present in the
 * path, it will be removed: `dirname("/foo/bar/baz.txt", ".txt") --> "baz"`
 *
 * *Note: this function operates on strings alone, and will not interact with
 * the file system.*
 * @params {string} path A filesystem path.
 * @returns {string} The filename component of the path.
 */
exports.extname = function(path) {
  var dot = path.lastIndexOf('.'),
      slash = path.lastIndexOf(SEPARATOR);
  // The last dot must be in the last path component, and it (the last dot) must
  // not start the last path component (i.e. be a dot that signifies a hidden
  // file in UNIX).
  return dot <= slash + 1 ? '' : path.substring(dot);
};
