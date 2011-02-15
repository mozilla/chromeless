/**
 * [`appinfo.json`](#guide/startup-parameters) is a small file that contains
 * various application parameters used in startup and packaging.
 *
 * This module give you conveinent read access to this file
 */

const appPaths = require('app-paths');
const file = require('file');
const path = require('path');

var appInfoContents = undefined;

/** (read-only) The contents of the `appinfo.json` file as a javascript object
 * @throws upon access if the appinfo.json file is malformed (this should happen
 * at application startup, and never during runtime.  In application code this
 * exception can be safely ignored).
 */
exports.__defineGetter__('contents', function() {
  if (!appInfoContents) {
    var contents = file.read(path.join(appPaths.browserCodeDir, 'appinfo.json'));
    appInfoContents = JSON.parse(contents);
    // XXX: validate!
  }
  return appInfoContents;
});
