function validPathPart(p, keepBlanks) {
  return typeof p === 'string' && (p || keepBlanks);
}

const {Cc,Ci} = require("chrome");
const runtime = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);
const SEPARATOR = runtime.OS=="WINNT"?'\\':'/';
const SPLIT_REGEXP = runtime.OS=="WINNT"?/^|\\(?!$)/:/^|\/(?!$)/;
const REPLACE_LAST_REGEXP= runtime.OS=="WINNT"?/\\+$/:/\/+$/;

exports.join = function() {
  var args = Array.prototype.slice.call(arguments);
  // edge case flag to switch into url-resolve-mode
  var keepBlanks = false;
  if (args[args.length - 1] === true) {
    keepBlanks = args.pop();
  }
  // return exports.split(args.join("/"), keepBlanks).join("/");
  var joined = exports.normalizeArray(args, keepBlanks).join(SEPARATOR);
  return joined;
};


exports.split = function(path, keepBlanks) {
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


exports.normalizeArray = function(original, keepBlanks) {
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


exports.normalize = function(path, keepBlanks) {
  return exports.join(path, keepBlanks || false);
};


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


exports.basename = function(path, ext) {
  var f = path.substr(path.lastIndexOf(SEPARATOR) + 1);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  var dot = path.lastIndexOf('.'),
      slash = path.lastIndexOf(SEPARATOR);
  // The last dot must be in the last path component, and it (the last dot) must
  // not start the last path component (i.e. be a dot that signifies a hidden
  // file in UNIX).
  return dot <= slash + 1 ? '' : path.substring(dot);
};


exports.exists = function(path, callback) {
  var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
  try {
    file.initWithPath(path);
  } catch(e) {
    return callback(false);
  }
  return callback(file.exists());
};


exports.existsSync = function(path) {
  var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
  try {
    file.initWithPath(path);
  } catch(e) {
    return false;
  }
  return file.exists();
};
